#!/usr/bin/env node
import { readStdin, sendEvent, respond, getSessionId } from "./hook-utils.js";
import { randomUUID } from "node:crypto";

const input = readStdin();
const sessionId = input.session_id as string || randomUUID();

sendEvent("/api/sessions", {
  id: sessionId,
  project_id: null,
});

sendEvent("/api/events", {
  session_id: sessionId,
  event_type: "session_start",
  payload: {
    cwd: input.cwd || process.cwd(),
    start_time: new Date().toISOString(),
  },
});

respond(true);
