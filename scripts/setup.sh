#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# MCP ProjectManager - One-command Setup Script
# Usage: /Users/carpdm/Documents/mcp_servers/MCP_ProjectManager/scripts/setup.sh
# Run from any project directory to set up MCP PM for that project.
# ============================================================================

MONOREPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
PID_DIR="$HOME/.mcp-pm/pids"
CLAUDE_DIR="$PROJECT_DIR/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"
BACKEND_PORT=48293
DASHBOARD_PORT=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[MCP-PM]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL  ]${NC} $1"; exit 1; }

# ============================================================================
# Step 1: Pre-flight checks
# ============================================================================
log "Step 1/7: Pre-flight checks..."

# Node.js 18+
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install Node.js 18+."
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  fail "Node.js 18+ required (found v$(node -v))"
fi
ok "Node.js $(node -v)"

# Python 3.11+
if ! command -v python3 &>/dev/null; then
  fail "Python 3 not found. Install Python 3.11+."
fi
PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 11 ]; }; then
  fail "Python 3.11+ required (found $PY_VER)"
fi
ok "Python $PY_VER"

# Port availability (skip if already running our services)
check_port() {
  local port=$1
  local name=$2
  if lsof -iTCP:"$port" -sTCP:LISTEN -t &>/dev/null; then
    local pid=$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
    # Check if it's our service
    if [ -f "$PID_DIR/$name.pid" ] && [ "$(cat "$PID_DIR/$name.pid" 2>/dev/null)" = "$pid" ]; then
      warn "Port $port already used by MCP-PM $name (pid $pid) — reusing"
      return 1  # Already running
    else
      warn "Port $port in use by pid $pid. Will attempt to use existing service."
      return 1
    fi
  fi
  return 0
}

NEED_BACKEND=true
NEED_DASHBOARD=true
if ! check_port $BACKEND_PORT "backend"; then
  NEED_BACKEND=false
fi
if ! check_port $DASHBOARD_PORT "dashboard"; then
  NEED_DASHBOARD=false
fi

# Monorepo exists
if [ ! -f "$MONOREPO_DIR/package.json" ]; then
  fail "Monorepo not found at $MONOREPO_DIR"
fi
ok "Monorepo at $MONOREPO_DIR"

# ============================================================================
# Step 2: Build (if needed)
# ============================================================================
log "Step 2/7: Checking builds..."

# MCP Server build
if [ ! -d "$MONOREPO_DIR/packages/mcp-server/dist" ]; then
  log "Building MCP Server..."
  (cd "$MONOREPO_DIR/packages/mcp-server" && npx tsup src/index.ts --format esm --dts --clean)
  ok "MCP Server built"
else
  ok "MCP Server already built"
fi

# Dashboard build
if [ ! -d "$MONOREPO_DIR/packages/dashboard/.next" ]; then
  log "Building Dashboard..."
  (cd "$MONOREPO_DIR/packages/dashboard" && npx next build)
  ok "Dashboard built"
else
  ok "Dashboard already built"
fi

# Backend venv
BACKEND_DIR="$MONOREPO_DIR/packages/backend"
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  log "Creating Python venv..."
  (cd "$BACKEND_DIR" && python3 -m venv .venv && .venv/bin/pip install -e ".[dev]" 2>/dev/null || .venv/bin/pip install -e .)
  ok "Python venv created"
else
  ok "Python venv exists"
fi

# ============================================================================
# Step 3: Start services
# ============================================================================
log "Step 3/7: Starting services..."

mkdir -p "$PID_DIR"
mkdir -p "$HOME/.mcp-pm"

# Backend
if [ "$NEED_BACKEND" = true ]; then
  log "Starting Backend (port $BACKEND_PORT)..."
  "$BACKEND_DIR/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --app-dir "$BACKEND_DIR" &>/dev/null &
  BACKEND_PID=$!
  echo "$BACKEND_PID" > "$PID_DIR/backend.pid"

  # Wait for backend health
  for i in $(seq 1 15); do
    if curl -sf "http://localhost:$BACKEND_PORT/api/dashboard/overview" &>/dev/null; then
      ok "Backend running (pid $BACKEND_PID)"
      break
    fi
    if [ "$i" -eq 15 ]; then
      fail "Backend failed to start within 15 seconds"
    fi
    sleep 1
  done
else
  ok "Backend already running on port $BACKEND_PORT"
fi

# Dashboard
if [ "$NEED_DASHBOARD" = true ]; then
  log "Starting Dashboard (port $DASHBOARD_PORT)..."
  npx --prefix "$MONOREPO_DIR/packages/dashboard" next start --port "$DASHBOARD_PORT" &>/dev/null &
  DASHBOARD_PID=$!
  echo "$DASHBOARD_PID" > "$PID_DIR/dashboard.pid"

  for i in $(seq 1 15); do
    if curl -sf "http://localhost:$DASHBOARD_PORT" &>/dev/null; then
      ok "Dashboard running (pid $DASHBOARD_PID)"
      break
    fi
    if [ "$i" -eq 15 ]; then
      warn "Dashboard may still be starting up"
    fi
    sleep 1
  done
else
  ok "Dashboard already running on port $DASHBOARD_PORT"
fi

# ============================================================================
# Step 4: Register MCP Server in Claude Code settings
# ============================================================================
log "Step 4/7: Registering MCP Server..."

mkdir -p "$CLAUDE_DIR"

MCP_SERVER_PATH="$MONOREPO_DIR/packages/mcp-server/dist/index.js"

if [ ! -f "$MCP_SERVER_PATH" ]; then
  fail "MCP Server dist not found at $MCP_SERVER_PATH"
fi

# Build the mcpServers config
MCP_CONFIG=$(cat <<MCPEOF
{
  "mcp-project-manager": {
    "command": "node",
    "args": ["$MCP_SERVER_PATH"],
    "env": {
      "FASTAPI_BASE_URL": "http://localhost:$BACKEND_PORT"
    }
  }
}
MCPEOF
)

# Merge into existing settings
if [ -f "$SETTINGS_FILE" ]; then
  EXISTING=$(cat "$SETTINGS_FILE")
else
  EXISTING='{}'
fi

# Use node to merge JSON (safe and handles edge cases)
MERGED=$(node -e "
const existing = JSON.parse(process.argv[1]);
const mcpConfig = JSON.parse(process.argv[2]);
existing.mcpServers = { ...(existing.mcpServers || {}), ...mcpConfig };
console.log(JSON.stringify(existing, null, 2));
" "$EXISTING" "$MCP_CONFIG")

echo "$MERGED" > "$SETTINGS_FILE"
ok "MCP Server registered in $SETTINGS_FILE"

# ============================================================================
# Step 5: Install Hooks
# ============================================================================
log "Step 5/7: Installing hooks..."

# Each hook: inline node script that reads stdin, POSTs to backend, responds with {continue:true}
# This avoids needing to build individual hook entry points.
BACKEND_URL="http://localhost:$BACKEND_PORT"

make_hook_cmd() {
  local event_type=$1
  local extra_logic=${2:-""}
  # Base: read stdin JSON, POST to backend, respond {continue:true}
  cat <<HOOKEOF
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';${extra_logic}fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'${event_type}',payload:d})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
}

# SessionStart also creates a session record
SESSION_START_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const crypto=require('crypto');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||crypto.randomUUID();fetch('BACKEND_URL/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sid,project_id:null})}).catch(()=>{});fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'session_start',payload:{cwd:d.cwd||process.cwd(),start_time:new Date().toISOString()}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
SESSION_START_CMD="${SESSION_START_CMD//BACKEND_URL/$BACKEND_URL}"

# SessionEnd
SESSION_END_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'session_end',payload:{end_time:new Date().toISOString()}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
SESSION_END_CMD="${SESSION_END_CMD//BACKEND_URL/$BACKEND_URL}"

# PreToolUse
PRE_TOOL_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_call',payload:{tool_name:d.tool_name||d.toolName,phase:'start',parameters:d.tool_input||d.input}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
PRE_TOOL_CMD="${PRE_TOOL_CMD//BACKEND_URL/$BACKEND_URL}"

# PostToolUse
POST_TOOL_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_result',payload:{tool_name:d.tool_name||d.toolName,phase:'end',result_summary:d.tool_output?d.tool_output.substring(0,500):''}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
POST_TOOL_CMD="${POST_TOOL_CMD//BACKEND_URL/$BACKEND_URL}"

# UserPromptSubmit
USER_PROMPT_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'user_prompt',payload:{prompt_length:d.prompt?d.prompt.length:0}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
USER_PROMPT_CMD="${USER_PROMPT_CMD//BACKEND_URL/$BACKEND_URL}"

# SubagentStart
SUBAGENT_START_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'subagent_start',payload:d})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
SUBAGENT_START_CMD="${SUBAGENT_START_CMD//BACKEND_URL/$BACKEND_URL}"

# SubagentStop
SUBAGENT_STOP_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'subagent_stop',payload:d})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
SUBAGENT_STOP_CMD="${SUBAGENT_STOP_CMD//BACKEND_URL/$BACKEND_URL}"

# Stop
STOP_CMD=$(cat <<'HOOKEOF'
node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('BACKEND_URL/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'stop',payload:{reason:d.reason||'unknown'}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"
HOOKEOF
)
STOP_CMD="${STOP_CMD//BACKEND_URL/$BACKEND_URL}"

# Merge hooks into settings using node
CURRENT_SETTINGS=$(cat "$SETTINGS_FILE")

HOOKS_JSON=$(node -e "
const hooks = {
  SessionStart: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$SESSION_START_CMD") }],
  SessionEnd: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$SESSION_END_CMD") }],
  PreToolUse: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$PRE_TOOL_CMD") }],
  PostToolUse: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$POST_TOOL_CMD") }],
  UserPromptSubmit: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$USER_PROMPT_CMD") }],
  SubagentStart: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$SUBAGENT_START_CMD") }],
  SubagentStop: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$SUBAGENT_STOP_CMD") }],
  Stop: [{ type: 'command', command: $(node -e "console.log(JSON.stringify(process.argv[1]))" "$STOP_CMD") }]
};
console.log(JSON.stringify(hooks));
")

FINAL_SETTINGS=$(node -e "
const settings = JSON.parse(process.argv[1]);
const hooks = JSON.parse(process.argv[2]);
// Merge hooks: preserve existing non-mcp-pm hooks
const existing = settings.hooks || {};
for (const [event, newHooks] of Object.entries(hooks)) {
  const current = existing[event] || [];
  // Remove old mcp-pm hooks (containing our backend URL)
  const filtered = current.filter(h => !(h.command && h.command.includes('$BACKEND_PORT/api/events')));
  existing[event] = [...filtered, ...newHooks];
}
settings.hooks = existing;
console.log(JSON.stringify(settings, null, 2));
" "$CURRENT_SETTINGS" "$HOOKS_JSON")

echo "$FINAL_SETTINGS" > "$SETTINGS_FILE"
ok "8 hooks installed"

# ============================================================================
# Step 6: Auto-register project
# ============================================================================
log "Step 6/7: Registering project '$PROJECT_NAME'..."

REGISTER_RESULT=$(curl -sf -X POST "http://localhost:$BACKEND_PORT/api/projects" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$PROJECT_NAME\", \"description\": \"Auto-registered by MCP-PM setup\", \"path\": \"$PROJECT_DIR\"}" 2>/dev/null || echo "FAIL")

if echo "$REGISTER_RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.exit(d.id?0:1)" 2>/dev/null; then
  PROJECT_ID=$(echo "$REGISTER_RESULT" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.id)")
  ok "Project registered: $PROJECT_NAME (id: $PROJECT_ID)"
else
  warn "Project registration skipped (may already exist)"
fi

# ============================================================================
# Step 7: Verification
# ============================================================================
log "Step 7/7: Verification..."

ERRORS=0

# Backend health
if curl -sf "http://localhost:$BACKEND_PORT/api/dashboard/overview" &>/dev/null; then
  ok "Backend API healthy"
else
  warn "Backend API not responding"
  ERRORS=$((ERRORS + 1))
fi

# Dashboard health
if curl -sf "http://localhost:$DASHBOARD_PORT" &>/dev/null; then
  ok "Dashboard accessible"
else
  warn "Dashboard not responding (may still be starting)"
fi

# Settings file
if [ -f "$SETTINGS_FILE" ]; then
  HOOK_COUNT=$(node -e "const s=JSON.parse(require('fs').readFileSync('$SETTINGS_FILE','utf8'));console.log(Object.keys(s.hooks||{}).length)")
  MCP_COUNT=$(node -e "const s=JSON.parse(require('fs').readFileSync('$SETTINGS_FILE','utf8'));console.log(Object.keys(s.mcpServers||{}).length)")
  ok "Settings: $MCP_COUNT MCP server(s), $HOOK_COUNT hook event(s)"
else
  warn "Settings file not found"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  MCP ProjectManager Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Project:    ${BLUE}$PROJECT_NAME${NC}"
echo -e "  Backend:    ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo -e "  Dashboard:  ${BLUE}http://localhost:$DASHBOARD_PORT${NC}"
echo -e "  Settings:   ${BLUE}$SETTINGS_FILE${NC}"
echo ""
echo -e "  ${YELLOW}Restart Claude Code to load MCP server and hooks.${NC}"
echo ""
echo -e "  Other commands:"
echo -e "    Stop:    ${BLUE}$MONOREPO_DIR/scripts/teardown.sh${NC}"
echo -e "    Status:  ${BLUE}$MONOREPO_DIR/scripts/status.sh${NC}"
echo ""

# Alias suggestion
if ! grep -q "mcp-pm-setup" "$HOME/.zshrc" 2>/dev/null && ! grep -q "mcp-pm-setup" "$HOME/.bashrc" 2>/dev/null; then
  echo -e "  ${YELLOW}Tip: Add aliases to your shell config:${NC}"
  echo ""
  echo "    cat >> ~/.zshrc << 'ALIAS'"
  echo "    alias mcp-pm-setup='$MONOREPO_DIR/scripts/setup.sh'"
  echo "    alias mcp-pm-stop='$MONOREPO_DIR/scripts/teardown.sh'"
  echo "    alias mcp-pm-status='$MONOREPO_DIR/scripts/status.sh'"
  echo "    ALIAS"
  echo ""
fi
