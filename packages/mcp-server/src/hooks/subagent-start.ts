#!/usr/bin/env node
import { readStdin, sendEvent, respond, getSessionId } from "./hook-utils.js";

const input = readStdin();
const sessionId = getSessionId(input);

sendEvent("/api/events/agent-executions", {
  session_id: sessionId,
  agent_type: input.agent_type || input.subagent_type || "unknown",
  model: input.model || "unknown",
  task_description: input.task_description || input.description || null,
});

sendEvent("/api/events", {
  session_id: sessionId,
  event_type: "agent_spawn",
  payload: {
    agent_type: input.agent_type || input.subagent_type,
    model: input.model,
    task_description: input.task_description || input.description,
  },
});

respond(true);
