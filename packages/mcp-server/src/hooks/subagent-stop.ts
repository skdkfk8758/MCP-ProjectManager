#!/usr/bin/env node
import { readStdin, sendEvent, respond, getSessionId } from "./hook-utils.js";

const input = readStdin();
const sessionId = getSessionId(input);

sendEvent("/api/events", {
  session_id: sessionId,
  event_type: "agent_complete",
  payload: {
    agent_type: input.agent_type || input.subagent_type,
    model: input.model,
    status: input.status || "completed",
    duration_ms: input.duration_ms,
    token_usage: input.token_usage,
  },
});

respond(true);
