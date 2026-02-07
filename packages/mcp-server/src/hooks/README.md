# Claude Code Hook Handlers

This directory contains hook handlers that integrate with Claude Code's event system.

## Overview

These hooks capture Claude Code events and send them to the FastAPI backend for tracking and analytics.

## Hook Files

| Hook | Event | Purpose |
|------|-------|---------|
| `pre-tool-use.ts` | PreToolUse | Record when a tool is about to be called |
| `post-tool-use.ts` | PostToolUse | Record tool completion, track file changes |
| `session-start.ts` | SessionStart | Initialize new session tracking |
| `session-end.ts` | SessionEnd | Update session with end time and summary |
| `subagent-start.ts` | SubagentStart | Track agent spawn events |
| `subagent-stop.ts` | SubagentStop | Track agent completion |
| `user-prompt-submit.ts` | UserPromptSubmit | Record user prompts |
| `stop.ts` | Stop | Handle graceful shutdown |

## Shared Utilities

`hook-utils.ts` provides:
- `readStdin()` - Parse JSON input from Claude Code
- `sendEvent()` - Fire-and-forget POST to FastAPI backend
- `respond()` - Output `{"continue": true}` to not block Claude
- `getSessionId()` - Extract session ID from input or env

## Installation

The `install.ts` module provides `installHooks()` function that:
1. Creates `.claude/settings.local.json` in the project directory
2. Adds hook commands to the appropriate event handlers
3. Avoids duplicate installation

Used by the CLI `init` command.

## Hook Behavior

All hooks:
- Read JSON from stdin
- Parse event data
- Send to FastAPI backend (fire-and-forget, 3s timeout)
- Output `{"continue": true}` to allow Claude to proceed
- Never block Claude Code execution (errors are swallowed)

## Backend Endpoints

| Hook | Endpoint | Method |
|------|----------|--------|
| session-start | `/api/sessions` | POST |
| session-end | `/api/sessions/{id}` | PUT |
| pre/post-tool-use | `/api/events` | POST |
| post-tool-use | `/api/events/tool-calls/batch` | POST |
| post-tool-use (files) | `/api/events/file-changes/batch` | POST |
| subagent-start | `/api/events/agent-executions` | POST |
| subagent-* | `/api/events` | POST |
| user-prompt-submit | `/api/events` | POST |

## Environment Variables

- `FASTAPI_BASE_URL` - Backend URL (default: `http://localhost:48293`)
- `CLAUDE_SESSION_ID` - Fallback session ID if not in input

## Example Usage

Hooks are executed by Claude Code:

```bash
echo '{"session_id":"abc","tool_name":"Read"}' | node --import tsx/esm src/hooks/pre-tool-use.ts
# Output: {"continue":true}
```

## File Change Tracking

The `post-tool-use.ts` hook automatically tracks file changes from:
- `Write` tool → change_type: "created"
- `Edit` tool → change_type: "modified"
- `NotebookEdit` tool → change_type: "modified"

Extracts `file_path` from tool input and sends to `/api/events/file-changes/batch`.
