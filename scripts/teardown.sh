#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# MCP ProjectManager - Teardown Script
# Stops services and removes MCP/hook configuration from current project.
# ============================================================================

MONOREPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(pwd)"
PID_DIR="$HOME/.mcp-pm/pids"
CLAUDE_DIR="$PROJECT_DIR/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"
BACKEND_PORT=48293
DASHBOARD_PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[MCP-PM]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }

# ============================================================================
# Step 1: Stop services
# ============================================================================
log "Stopping services..."

stop_service() {
  local name=$1
  local port=$2
  local pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      for i in $(seq 1 5); do
        if ! kill -0 "$pid" 2>/dev/null; then
          break
        fi
        sleep 1
      done
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
      ok "Stopped $name (pid $pid)"
    else
      warn "$name (pid $pid) was not running"
    fi
    rm -f "$pid_file"
  else
    # Try to find by port
    local pid=$(lsof -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null || true
      ok "Stopped $name on port $port (pid $pid)"
    else
      warn "No $name process found on port $port"
    fi
  fi
}

stop_service "backend" "$BACKEND_PORT"
stop_service "dashboard" "$DASHBOARD_PORT"

# Clean PID directory
rm -rf "$PID_DIR"

# ============================================================================
# Step 2: Remove MCP server and hooks from settings
# ============================================================================
log "Cleaning Claude Code settings..."

if [ -f "$SETTINGS_FILE" ]; then
  CLEANED=$(node -e "
const fs = require('fs');
const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));

// Remove MCP server
if (settings.mcpServers) {
  delete settings.mcpServers['mcp-project-manager'];
  if (Object.keys(settings.mcpServers).length === 0) {
    delete settings.mcpServers;
  }
}

// Remove hooks containing our backend URL
if (settings.hooks) {
  for (const [event, handlers] of Object.entries(settings.hooks)) {
    settings.hooks[event] = handlers.filter(
      h => !(h.command && h.command.includes('$BACKEND_PORT/api/'))
    );
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }
}

console.log(JSON.stringify(settings, null, 2));
")

  echo "$CLEANED" > "$SETTINGS_FILE"
  ok "Removed MCP server and hooks from settings"
else
  warn "No settings file found at $SETTINGS_FILE"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  MCP ProjectManager Teardown Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Services stopped, MCP server and hooks removed."
echo -e "  ${YELLOW}Restart Claude Code to apply changes.${NC}"
echo ""
echo -e "  Note: Project data in ~/.mcp-pm/mcp_pm.db is preserved."
echo -e "  To re-setup: ${BLUE}$MONOREPO_DIR/scripts/setup.sh${NC}"
echo ""
