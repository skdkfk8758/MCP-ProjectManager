#!/usr/bin/env node
import { readStdin, sendEvent, respond, getSessionId } from "./hook-utils.js";

const input = readStdin();
const sessionId = getSessionId(input);

// Record tool call completion
sendEvent("/api/events/tool-calls/batch", {
  tool_calls: [{
    session_id: sessionId,
    tool_name: input.tool_name || input.toolName,
    parameters: input.tool_input || input.input,
    duration_ms: input.duration_ms,
    success: input.error == null,
  }],
});

// Track file changes from Write/Edit tools
const toolName = (input.tool_name || input.toolName || "") as string;
if (["Write", "Edit", "NotebookEdit"].includes(toolName)) {
  const filePath = (input.tool_input as any)?.file_path || (input.input as any)?.file_path;
  if (filePath) {
    sendEvent("/api/events/file-changes/batch", {
      file_changes: [{
        session_id: sessionId,
        file_path: filePath,
        change_type: toolName === "Write" ? "created" : "modified",
        lines_added: 0,
        lines_removed: 0,
      }],
    });
  }
}

respond(true);
