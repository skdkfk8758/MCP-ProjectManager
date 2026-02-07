#!/usr/bin/env node
import { readStdin, sendEvent, respond, getSessionId } from "./hook-utils.js";

const input = readStdin();
const sessionId = getSessionId(input);

const promptText = (input.prompt || input.message || "") as string;

sendEvent("/api/events", {
  session_id: sessionId,
  event_type: "prompt",
  payload: {
    prompt_text: promptText.substring(0, 500), // Truncate for storage
    token_count: input.token_count || null,
  },
});

respond(true);
