**English** | [한국어](README.ko.md)

# MCP Project Manager

A comprehensive project management and workflow tracking system integrated with Claude Code. Powered by Model Context Protocol (MCP), it automatically captures Claude Code sessions, tool usage, agent invocations, and project tasks into a centralized dashboard and database.

[![npm version](https://img.shields.io/npm/v/create-mcp-pm.svg)](https://www.npmjs.com/package/create-mcp-pm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/python-%3E%3D3.11-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.7.0-blue.svg)](https://www.typescriptlang.org/)

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

MCP Project Manager is a 3-tier system that transforms your Claude Code workflows into actionable intelligence. It automatically tracks:

- Session activity and timeline
- Tool usage patterns and performance
- Agent execution and skill invocations
- Project tasks, milestones, and deliverables
- File changes and code metrics
- Team analytics and insights

The system provides a visual dashboard, REST API, and integrates seamlessly with Claude Desktop via MCP.

### Key Capabilities

- **Automatic Event Capture**: 8 Claude Code hook handlers capture sessions, tools, agents, and prompts without any user intervention
- **Real-time Dashboard**: Live updates via WebSocket with Kanban boards, flow graphs, and analytics charts
- **Flow Visualization**: Graph-based view of agent executions, tool calls, and decision flows
- **Smart Analytics**: Token usage, agent distribution, success rates, and timeline insights
- **Project Management**: Create projects, track tasks, set milestones, and manage deliverables
- **One-Command Setup**: `npx create-mcp-pm` handles cloning, building, configuration, and MCP registration

## Quick Start

### Installation

The fastest way to get started is:

```bash
# Option 1: Direct install from GitHub (no npm account needed)
curl -fsSL https://raw.githubusercontent.com/skdkfk8758/MCP-ProjectManager/main/scripts/install.sh | bash

# Option 2: npx (available after npm publish)
npx create-mcp-pm
```

This single command:
1. Checks for required dependencies (Node.js 20+, Python 3.11+, git)
2. Clones the MCP ProjectManager repository
3. Installs all dependencies via pnpm
4. Builds all packages (MCP Server, CLI, Dashboard, Backend)
5. Sets up the Python backend with virtual environment
6. Registers the MCP server with Claude Desktop
7. Installs Claude Code hook handlers

### Manual Setup (for Development)

If you're developing locally:

```bash
# Clone the repository
git clone https://github.com/skdkfk8758/MCP-ProjectManager.git
cd MCP_ProjectManager

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Set up Python backend
cd packages/backend
python3 -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e .
cd ../..

# Register with Claude Desktop and install hooks
mcp-pm setup

# Start services
mcp-pm start
```

### Accessing the Dashboard

Once running:

- **Dashboard**: http://localhost:48294
- **Backend API**: http://localhost:48293
- **API Documentation**: http://localhost:48293/docs

## Architecture

### 3-Tier Design

```
┌─────────────────────────────────────────┐
│         Claude Desktop / Claude Code    │
│              (MCP Client)               │
└──────────────┬──────────────────────────┘
               │
               │ MCP Protocol
               ▼
┌─────────────────────────────────────────┐
│    MCP Server (TypeScript)              │
│  33 Tools + 8 Hook Handlers             │
│  • Flow Events & Sessions               │
│  • Project Management CRUD              │
│  • Analytics & Queries                  │
└──────────────┬──────────────────────────┘
               │
               │ REST API / WebSocket
               ▼
┌─────────────────────────────────────────┐
│   FastAPI Backend (Python 3.11+)        │
│   SQLAlchemy ORM + SQLite (WAL)         │
│   • 15 database tables                  │
│   • Real-time WebSocket updates         │
│   • Async/await execution               │
└──────────────┬──────────────────────────┘
               │
               │ WebSocket / HTTP
               ▼
┌─────────────────────────────────────────┐
│    Next.js Dashboard (React 19)         │
│   • Kanban board with drag-and-drop     │
│   • Flow graph visualization            │
│   • Analytics & timeline views          │
│   • Real-time project tracking          │
└─────────────────────────────────────────┘
```

### Packages Overview

| Package | Purpose | Tech Stack | Location |
|---------|---------|-----------|----------|
| **mcp-server** | MCP protocol server with 33 tools and 8 hook handlers | TypeScript, @modelcontextprotocol/sdk, tsup | `packages/mcp-server` |
| **backend** | REST API, database, real-time WebSocket updates | Python 3.11, FastAPI, SQLAlchemy, aiosqlite | `packages/backend` |
| **dashboard** | Web UI for projects, tasks, sessions, analytics | Next.js 15, React 19, @xyflow/react, recharts, @dnd-kit | `packages/dashboard` |
| **cli** | Command-line tool for setup, start, stop, status, teardown | TypeScript, Commander | `packages/cli` |
| **create-mcp-pm** | One-command bootstrap and setup script | TypeScript | `packages/create-mcp-pm` |

## Features

### MCP Server (33 Tools)

#### Flow & Session Tracking (6 tools)
- `flow_trigger_agent` - Record agent spawn events
- `flow_update_agent` - Update agent status
- `flow_session_start` - Initialize session
- `flow_session_end` - Close session with summary
- `flow_get_session` - Retrieve session data
- `flow_list_sessions` - Query all sessions

#### Project Management CRUD (15 tools)
- **Projects**: `pm_create_project`, `pm_update_project`, `pm_delete_project`, `pm_list_projects`
- **Tasks**: `pm_create_task`, `pm_update_task`, `pm_delete_task`, `pm_list_tasks`
- **Milestones**: `pm_create_milestone`, `pm_update_milestone`, `pm_delete_milestone`, `pm_list_milestones`
- **Labels**: `pm_create_label`, `pm_list_labels`
- **Bulk Actions**: `pm_batch_update_tasks`

#### Query & Analysis (6 tools)
- `pm_search_tasks` - Full-text task search
- `pm_get_task_stats` - Task statistics and burndown
- `pm_analyze_session` - Session metrics and insights
- `pm_get_timeline` - Historical view of events
- `pm_export_project` - Export data in JSON/CSV

#### Flow Events (12 tools)
- Tool call events: `flow_emit_tool_call`, `flow_update_tool_call`
- Agent events: `flow_emit_agent_event`
- Custom event tracking with metadata

### Claude Code Hook Handlers (8)

Automatic event capture via Claude Code hooks:

| Hook | Event | Captures |
|------|-------|----------|
| `session-start` | SessionStart | New session initialization |
| `session-end` | SessionEnd | Session completion and summary |
| `pre-tool-use` | PreToolUse | Tool about to execute |
| `post-tool-use` | PostToolUse | Tool completion, file changes |
| `subagent-start` | SubagentStart | Agent spawn |
| `subagent-stop` | SubagentStop | Agent completion |
| `user-prompt-submit` | UserPromptSubmit | User prompts and queries |
| `stop` | Stop | Graceful shutdown |

### Dashboard Features

#### Core Views
- **Kanban Board**: Drag-and-drop task management with custom columns
- **Flow Graph**: Visual representation of agent execution trees (@xyflow/react)
- **Timeline**: Historical view of all events and activities
- **Analytics Dashboard**: Charts, agent distribution, token usage, success rates

#### Real-time Updates
- WebSocket-powered live updates (no polling)
- Optimistic updates on the Kanban board
- Live session tracking

### Database (SQLite WAL Mode)

15 tables with comprehensive data model:
- Sessions, Events, Tool Calls, File Changes
- Projects, Tasks, Milestones, Labels
- Agent Executions, Skills, Flow Nodes
- Analytics snapshots

## Development

### Requirements

- Node.js 20.0.0 or higher
- Python 3.11 or higher
- pnpm 9.0.0 or higher (package manager)
- git

### Build Commands

```bash
# Build all packages in dependency order
pnpm build

# Build individual packages
pnpm build -F @mcp-pm/server
pnpm build -F @mcp-pm/backend
pnpm build -F @mcp-pm/dashboard
pnpm build -F @mcp-pm/cli

# Watch mode for development
pnpm dev

# Run linting
pnpm lint

# Run tests (if configured)
pnpm test

# Clean all build artifacts
pnpm clean
```

### Development Workflow

#### Start Backend

```bash
cd packages/backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
python main.py
# Backend runs on http://localhost:48293
```

#### Start Dashboard

```bash
cd packages/dashboard
pnpm dev
# Dashboard runs on http://localhost:48294
```

#### Start MCP Server (for local testing)

```bash
cd packages/mcp-server
pnpm dev
```

### Key Development Notes

- **Async Python**: Backend uses SQLAlchemy async ORM. Always await database calls.
- **Greenlet Requirement**: Required for aiosqlite + SQLAlchemy async compatibility.
- **Next.js 15 Routes**: Dynamic route params are Promises. Use `use()` to unwrap them.
- **Hook Handlers**: Located in `packages/mcp-server/src/hooks/`. Fire-and-forget pattern to avoid blocking Claude Code.
- **TypeScript Strict**: Use TypeScript strict mode. Check with `pnpm lint`.

### Environment Variables

#### Backend (.env in packages/backend)
```bash
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=48293
FASTAPI_DEBUG=true
DATABASE_URL=sqlite://~/.mcp-pm/mcp_pm.db
```

#### Dashboard (.env.local in packages/dashboard)
```bash
NEXT_PUBLIC_API_URL=http://localhost:48293
```

#### Claude Code Hooks
```bash
FASTAPI_BASE_URL=http://localhost:48293
CLAUDE_SESSION_ID=<optional-fallback>
```

## Project Structure

```
MCP_ProjectManager/
├── packages/
│   ├── mcp-server/              # MCP Server with 33 tools + 8 hooks
│   │   ├── src/
│   │   │   ├── tools/           # Tool implementations
│   │   │   │   ├── flow-events.ts
│   │   │   │   ├── flow-session.ts
│   │   │   │   ├── flow-agent.ts
│   │   │   │   ├── flow-tracking.ts
│   │   │   │   ├── pm-project.ts
│   │   │   │   ├── pm-task.ts
│   │   │   │   ├── pm-milestone.ts
│   │   │   │   ├── pm-actions.ts
│   │   │   │   ├── pm-query.ts
│   │   │   │   └── pm-analysis.ts
│   │   │   ├── hooks/           # Claude Code hook handlers
│   │   │   │   ├── session-start.ts
│   │   │   │   ├── session-end.ts
│   │   │   │   ├── pre-tool-use.ts
│   │   │   │   ├── post-tool-use.ts
│   │   │   │   ├── subagent-start.ts
│   │   │   │   ├── subagent-stop.ts
│   │   │   │   ├── user-prompt-submit.ts
│   │   │   │   ├── stop.ts
│   │   │   │   └── hook-utils.ts
│   │   │   ├── server.ts        # Main MCP server entry point
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── backend/                 # FastAPI Python backend
│   │   ├── app/
│   │   │   ├── models/          # SQLAlchemy ORM models
│   │   │   ├── api/             # Route handlers
│   │   │   ├── config.py        # Settings
│   │   │   ├── main.py          # FastAPI app
│   │   │   └── cli.py           # CLI entry point
│   │   ├── main.py              # Entry point (uvicorn)
│   │   ├── pyproject.toml       # Python dependencies
│   │   └── .venv/               # Virtual environment
│   │
│   ├── dashboard/               # Next.js 15 React dashboard
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # React custom hooks
│   │   │   ├── lib/             # Utilities, API client
│   │   │   └── styles/          # Tailwind CSS
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # TypeScript CLI tool
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts      # Setup command
│   │   │   │   ├── service.ts   # Start/stop/status
│   │   │   │   └── teardown.ts  # Remove MCP + hooks
│   │   │   └── index.ts         # CLI entry point
│   │   └── package.json
│   │
│   └── create-mcp-pm/           # Bootstrap script for npx
│       ├── src/
│       │   └── index.ts         # One-command setup
│       └── package.json
│
├── turbo.json                   # Turborepo config
├── pnpm-workspace.yaml          # pnpm workspaces
├── package.json                 # Root package
└── LICENSE                      # MIT License
```

## Database Schema

The backend uses SQLite with WAL mode for better concurrency. 15 core tables:

- **sessions** - Claude Code session tracking
- **events** - Generic event log
- **tool_calls** - Tool execution records
- **file_changes** - File modification tracking
- **agent_executions** - Agent spawn and completion
- **projects** - Project definitions
- **tasks** - Individual tasks within projects
- **milestones** - Project milestones
- **labels** - Task labels/tags
- **skills** - Agent skills and capabilities
- **flow_nodes** - Flow graph nodes
- **flow_edges** - Flow graph edges
- **analytics_snapshots** - Historical analytics data
- **session_summaries** - Session metadata and summaries
- **token_metrics** - Token usage tracking

## CLI Commands

The `mcp-pm` CLI provides project management:

```bash
# Full setup: environment check, build, start services, register MCP
mcp-pm setup

# Start services (backend + dashboard)
mcp-pm start [service]     # service: backend, dashboard, or all (default)

# Stop all running services
mcp-pm stop

# Check service status, builds, hooks, database
mcp-pm status

# Remove MCP server and hooks from Claude Desktop for this project
mcp-pm teardown
```

## Configuration

### Claude Desktop Integration

The MCP server is registered in `~/.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "mcp-project-manager": {
      "command": "npx",
      "args": ["@mcp-pm/server"]
    }
  },
  "hooks": {
    "SessionStart": [
      { "command": "npx @mcp-pm/server hooks/session-start.ts" }
    ],
    "PostToolUse": [
      { "command": "npx @mcp-pm/server hooks/post-tool-use.ts" }
    ]
    // ... other hooks
  }
}
```

Hook handlers are automatically installed during setup.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow TypeScript conventions** - use strict mode, write types
3. **Test your changes** - run `pnpm build` and `pnpm lint`
4. **Keep commits atomic** - one feature per commit
5. **Write clear commit messages** following conventional commits
6. **Update documentation** if you add features

### Development Tips

- Use `pnpm dev` in the root for parallel development
- Check `packages/mcp-server/src/hooks/README.md` for hook architecture
- Review backend models in `packages/backend/app/models/` for database schema
- Dashboard components use Tailwind CSS and shadcn-style utilities

## Troubleshooting

### Services won't start

```bash
# Check status and see detailed errors
mcp-pm status

# Verify environment
node --version  # Should be 20+
python3 --version  # Should be 3.11+
pnpm --version  # Should be 9+
```

### Backend won't connect

```bash
# Check if port 48293 is in use
lsof -i :48293

# Verify Python virtual environment
cd packages/backend
source .venv/bin/activate
pip list | grep fastapi
```

### Dashboard blank or won't load

```bash
# Check if port 3000 is in use
lsof -i :3000

# Rebuild dashboard
cd packages/dashboard
pnpm build
pnpm start
```

### Hook handlers not firing

```bash
# Verify hooks installed
grep -r "hooks" ~/.claude/settings.local.json

# Check hook file permissions
ls -la packages/mcp-server/src/hooks/
```

## Performance Notes

- **Database**: SQLite WAL mode for concurrent read/write
- **Backend**: Async/await with aiosqlite for non-blocking I/O
- **Dashboard**: Optimistic updates with React Query caching
- **Hooks**: Fire-and-forget with 3-second timeout to avoid blocking Claude
- **WebSocket**: Real-time updates with automatic reconnection

## License

MIT License - See [LICENSE](LICENSE) file for details

Copyright (c) 2025 MCP Project Manager Contributors

## Acknowledgments

Built with:
- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [TypeScript](https://www.typescriptlang.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [SQLAlchemy](https://www.sqlalchemy.org/)

## Support

For issues and questions:
- GitHub Issues: https://github.com/skdkfk8758/MCP-ProjectManager/issues
- Discussions: https://github.com/skdkfk8758/MCP-ProjectManager/discussions

---

**Ready to get started?** Run `npx create-mcp-pm` and start tracking your Claude Code workflows!
