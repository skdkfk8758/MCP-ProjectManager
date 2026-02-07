#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# MCP ProjectManager - Status Check Script
# Shows the current state of all MCP PM services and configuration.
# ============================================================================

MONOREPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_DIR="$(pwd)"
PID_DIR="$HOME/.mcp-pm/pids"
CLAUDE_DIR="$PROJECT_DIR/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.local.json"
DB_FILE="$HOME/.mcp-pm/mcp_pm.db"
BACKEND_PORT=48293
DASHBOARD_PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m'

status_ok()   { echo -e "  ${GREEN}●${NC} $1"; }
status_fail() { echo -e "  ${RED}●${NC} $1"; }
status_warn() { echo -e "  ${YELLOW}●${NC} $1"; }
status_info() { echo -e "  ${DIM}$1${NC}"; }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  MCP ProjectManager Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================================================
# Services
# ============================================================================
echo -e "${BLUE}Services:${NC}"

# Backend
BACKEND_PID=""
if [ -f "$PID_DIR/backend.pid" ]; then
  BACKEND_PID=$(cat "$PID_DIR/backend.pid")
fi

if lsof -iTCP:$BACKEND_PORT -sTCP:LISTEN -t &>/dev/null; then
  ACTUAL_PID=$(lsof -iTCP:$BACKEND_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
  if curl -sf "http://localhost:$BACKEND_PORT/api/dashboard/overview" &>/dev/null; then
    status_ok "Backend    : running on port $BACKEND_PORT (pid $ACTUAL_PID)"
  else
    status_warn "Backend    : port $BACKEND_PORT occupied (pid $ACTUAL_PID) but not healthy"
  fi
else
  status_fail "Backend    : not running (port $BACKEND_PORT)"
fi

# Dashboard
if lsof -iTCP:$DASHBOARD_PORT -sTCP:LISTEN -t &>/dev/null; then
  ACTUAL_PID=$(lsof -iTCP:$DASHBOARD_PORT -sTCP:LISTEN -t 2>/dev/null | head -1)
  if curl -sf "http://localhost:$DASHBOARD_PORT" &>/dev/null; then
    status_ok "Dashboard  : running on port $DASHBOARD_PORT (pid $ACTUAL_PID)"
  else
    status_warn "Dashboard  : port $DASHBOARD_PORT occupied (pid $ACTUAL_PID) but not responding"
  fi
else
  status_fail "Dashboard  : not running (port $DASHBOARD_PORT)"
fi

echo ""

# ============================================================================
# Database
# ============================================================================
echo -e "${BLUE}Database:${NC}"

if [ -f "$DB_FILE" ]; then
  DB_SIZE=$(du -h "$DB_FILE" | cut -f1 | xargs)
  status_ok "SQLite DB  : $DB_FILE ($DB_SIZE)"

  # Record counts (if sqlite3 available)
  if command -v sqlite3 &>/dev/null; then
    PROJECTS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM projects;" 2>/dev/null || echo "?")
    TASKS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM tasks;" 2>/dev/null || echo "?")
    SESSIONS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sessions;" 2>/dev/null || echo "?")
    EVENTS=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "?")
    status_info "Records    : $PROJECTS projects, $TASKS tasks, $SESSIONS sessions, $EVENTS events"
  fi
else
  status_fail "SQLite DB  : not found at $DB_FILE"
fi

echo ""

# ============================================================================
# Build Status
# ============================================================================
echo -e "${BLUE}Build Status:${NC}"

if [ -d "$MONOREPO_DIR/packages/mcp-server/dist" ]; then
  status_ok "MCP Server : built"
else
  status_fail "MCP Server : not built"
fi

if [ -d "$MONOREPO_DIR/packages/dashboard/.next" ]; then
  status_ok "Dashboard  : built"
else
  status_fail "Dashboard  : not built"
fi

if [ -d "$MONOREPO_DIR/packages/backend/.venv" ]; then
  status_ok "Backend    : venv exists"
else
  status_fail "Backend    : venv missing"
fi

echo ""

# ============================================================================
# Current Project Configuration
# ============================================================================
echo -e "${BLUE}Current Project ($(basename "$PROJECT_DIR")):${NC}"
status_info "Path: $PROJECT_DIR"

if [ -f "$SETTINGS_FILE" ]; then
  # Check MCP server
  HAS_MCP=$(node -e "const s=JSON.parse(require('fs').readFileSync('$SETTINGS_FILE','utf8'));console.log(s.mcpServers&&s.mcpServers['mcp-project-manager']?'yes':'no')" 2>/dev/null || echo "no")
  if [ "$HAS_MCP" = "yes" ]; then
    status_ok "MCP Server : registered"
  else
    status_fail "MCP Server : not registered"
  fi

  # Check hooks
  HOOK_COUNT=$(node -e "const s=JSON.parse(require('fs').readFileSync('$SETTINGS_FILE','utf8'));const h=s.hooks||{};let c=0;for(const[k,v]of Object.entries(h)){if(v.some(x=>x.command&&x.command.includes('$BACKEND_PORT/api/')))c++}console.log(c)" 2>/dev/null || echo "0")
  if [ "$HOOK_COUNT" -eq 8 ]; then
    status_ok "Hooks      : all 8 installed"
  elif [ "$HOOK_COUNT" -gt 0 ]; then
    status_warn "Hooks      : $HOOK_COUNT/8 installed"
  else
    status_fail "Hooks      : not installed"
  fi
else
  status_fail "Settings   : no .claude/settings.local.json"
fi

echo ""

# ============================================================================
# Quick Commands
# ============================================================================
echo -e "${DIM}Commands:${NC}"
echo -e "  ${DIM}Setup:    $MONOREPO_DIR/scripts/setup.sh${NC}"
echo -e "  ${DIM}Teardown: $MONOREPO_DIR/scripts/teardown.sh${NC}"
echo -e "  ${DIM}Status:   $MONOREPO_DIR/scripts/status.sh${NC}"
echo ""
