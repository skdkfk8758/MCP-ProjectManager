#!/usr/bin/env node
import { readStdin, respond, getSessionId } from "./hook-utils.js";

const input = readStdin();
const sessionId = getSessionId(input);

const baseUrl = process.env.FASTAPI_BASE_URL || "http://localhost:48293";

fetch(`${baseUrl}/api/sessions/${sessionId}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    end_time: new Date().toISOString(),
    token_usage: input.token_usage || null,
    summary: input.summary || null,
  }),
  signal: AbortSignal.timeout(3000),
}).catch(() => {});

respond(true);
