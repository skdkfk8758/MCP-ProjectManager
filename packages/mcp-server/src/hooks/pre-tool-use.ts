#!/usr/bin/env node
import { readStdin, sendEvent, respond, getSessionId } from "./hook-utils.js";

const input = readStdin();
const sessionId = getSessionId(input);

// Record tool call start
sendEvent("/api/events", {
  session_id: sessionId,
  event_type: "tool_call",
  payload: {
    tool_name: input.tool_name || input.toolName,
    phase: "start",
    parameters: input.tool_input || input.input,
  },
});

respond(true);
