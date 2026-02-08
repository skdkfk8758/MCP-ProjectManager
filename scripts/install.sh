#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# MCP ProjectManager - GitHub Direct Install Script
# Usage: curl -fsSL https://raw.githubusercontent.com/skdkfk8758/MCP-ProjectManager/main/scripts/install.sh | bash
# ============================================================================

REPO_URL="https://github.com/skdkfk8758/MCP-ProjectManager.git"
BASE_DIR="$HOME/.mcp-pm"
INSTALL_DIR="$BASE_DIR/MCP_ProjectManager"
CLI_PATH="$INSTALL_DIR/packages/cli/dist/index.js"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

log()   { echo -e "${BLUE}[MCP-PM]${NC} $1"; }
ok()    { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL  ]${NC} $1"; exit 1; }

# ============================================================================
# Step 1: Pre-flight checks
# ============================================================================
log "Step 1/9: Pre-flight checks..."

# git
if ! command -v git &>/dev/null; then
  fail "git not found. Please install git."
fi
ok "git available"

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

# ============================================================================
# Step 2: Ensure pnpm is available
# ============================================================================
log "Step 2/9: Ensuring pnpm..."

if ! command -v pnpm &>/dev/null; then
  log "pnpm not found. Installing via corepack..."
  if command -v corepack &>/dev/null; then
    corepack enable &>/dev/null || true
    corepack prepare pnpm@latest --activate &>/dev/null || true
    if command -v pnpm &>/dev/null; then
      ok "pnpm installed via corepack"
    else
      log "corepack failed. Installing pnpm via npm..."
      npm install -g pnpm &>/dev/null
      ok "pnpm installed via npm"
    fi
  else
    log "corepack not available. Installing pnpm via npm..."
    npm install -g pnpm &>/dev/null
    ok "pnpm installed via npm"
  fi
else
  PNPM_VER=$(pnpm --version 2>/dev/null || echo "unknown")
  ok "pnpm $PNPM_VER"
fi

# ============================================================================
# Step 3: Clone or update repository
# ============================================================================
log "Step 3/9: Getting MCP ProjectManager..."

mkdir -p "$BASE_DIR"

if [ -f "$INSTALL_DIR/package.json" ]; then
  # Repo exists — pull latest
  log "Repository found. Pulling latest..."
  if git -C "$INSTALL_DIR" pull --ff-only &>/dev/null; then
    ok "Repository updated"
  else
    warn "git pull failed (maybe on a different branch). Using existing version."
  fi
else
  # Fresh clone
  log "Cloning from $REPO_URL..."
  if git clone "$REPO_URL" "$INSTALL_DIR" &>/dev/null; then
    ok "Repository cloned"
  else
    fail "Failed to clone from $REPO_URL"
  fi
fi

# ============================================================================
# Step 4: Install dependencies
# ============================================================================
log "Step 4/9: Installing dependencies..."

cd "$INSTALL_DIR"

if [ -f "pnpm-lock.yaml" ]; then
  if pnpm install --frozen-lockfile &>/dev/null; then
    ok "Dependencies installed (frozen lockfile)"
  else
    log "Retrying without frozen lockfile..."
    pnpm install
    ok "Dependencies installed"
  fi
else
  pnpm install
  ok "Dependencies installed"
fi

# ============================================================================
# Step 5: Build MCP Server
# ============================================================================
log "Step 5/9: Building MCP Server..."

MCP_SERVER_DIST="$INSTALL_DIR/packages/mcp-server/dist"
if [ -d "$MCP_SERVER_DIST" ]; then
  ok "MCP Server already built"
else
  log "Building MCP Server..."
  (cd "$INSTALL_DIR/packages/mcp-server" && pnpm build)
  ok "MCP Server built"
fi

# ============================================================================
# Step 6: Build CLI
# ============================================================================
log "Step 6/9: Building CLI..."

CLI_DIST="$INSTALL_DIR/packages/cli/dist"
if [ -d "$CLI_DIST" ]; then
  ok "CLI already built"
else
  log "Building CLI..."
  (cd "$INSTALL_DIR/packages/cli" && pnpm build)
  ok "CLI built"
fi

# ============================================================================
# Step 7: Build Dashboard
# ============================================================================
log "Step 7/9: Building Dashboard..."

DASHBOARD_NEXT="$INSTALL_DIR/packages/dashboard/.next"
if [ -d "$DASHBOARD_NEXT" ]; then
  ok "Dashboard already built"
else
  log "Building Dashboard (this may take a minute)..."
  (cd "$INSTALL_DIR/packages/dashboard" && pnpm build)
  ok "Dashboard built"
fi

# ============================================================================
# Step 8: Setup Python backend
# ============================================================================
log "Step 8/9: Setting up Python backend..."

BACKEND_VENV="$INSTALL_DIR/packages/backend/.venv"
if [ -d "$BACKEND_VENV" ]; then
  ok "Python venv exists"
else
  log "Creating Python venv..."
  BACKEND_DIR="$INSTALL_DIR/packages/backend"
  (cd "$BACKEND_DIR" && python3 -m venv .venv)
  "$BACKEND_DIR/.venv/bin/pip" install --upgrade pip &>/dev/null
  if "$BACKEND_DIR/.venv/bin/pip" install -e ".[dev]" &>/dev/null 2>&1; then
    ok "Python venv created with dev dependencies"
  else
    "$BACKEND_DIR/.venv/bin/pip" install -e . &>/dev/null
    ok "Python venv created"
  fi
fi

# ============================================================================
# Step 9: Run CLI setup for current project
# ============================================================================
log "Step 9/9: Setting up MCP PM for current project..."

if [ ! -f "$CLI_PATH" ]; then
  fail "CLI not found at $CLI_PATH. Build may have failed."
fi

# Run the CLI's setup command in the context of the user's current project
PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

log "Running setup for '$PROJECT_NAME'..."
if node "$CLI_PATH" setup; then
  ok "Setup complete"
else
  fail "Setup command failed. Check the output above for details."
fi

# ============================================================================
# Success Summary
# ============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  MCP ProjectManager Installed Successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Project:      ${BLUE}$PROJECT_NAME${NC}"
echo -e "  Install Dir:  ${BLUE}$INSTALL_DIR${NC}"
echo -e "  Backend:      ${BLUE}http://localhost:48293${NC}"
echo -e "  Dashboard:    ${BLUE}http://localhost:48294${NC}"
echo ""
echo -e "  ${YELLOW}Restart Claude Code to load MCP server and hooks.${NC}"
echo ""
echo -e "${DIM}Tip: For convenience, you can add the CLI to PATH:${NC}"
echo -e "${DIM}  cd $INSTALL_DIR/packages/cli && npm link${NC}"
echo -e "${DIM}  Then use: mcp-pm status / mcp-pm teardown / mcp-pm setup${NC}"
echo ""
echo -e "${DIM}To set up another project, run this script from that directory:${NC}"
echo -e "${DIM}  cd ~/other-project && curl -fsSL https://raw.githubusercontent.com/skdkfk8758/MCP-ProjectManager/main/scripts/install.sh | bash${NC}"
echo ""
