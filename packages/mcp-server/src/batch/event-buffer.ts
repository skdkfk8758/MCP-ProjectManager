import { apiPost } from "../client/api-client.js";
import type { FlowEvent } from "../types/events.js";

const MAX_BUFFER_SIZE = 50;
const FLUSH_INTERVAL_MS = 2000;
const MAX_RETRY_BUFFER = 200;

let buffer: FlowEvent[] = [];
let retryBuffer: FlowEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function addEvent(event: FlowEvent): void {
  buffer.push(event);

  if (buffer.length >= MAX_BUFFER_SIZE) {
    flush();
  }
}

export function startAutoFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
}

export function stopAutoFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // Final flush
  if (buffer.length > 0) {
    flush();
  }
}

async function flush(): Promise<void> {
  if (buffer.length === 0 && retryBuffer.length === 0) return;

  const eventsToSend = [...retryBuffer, ...buffer];
  buffer = [];
  retryBuffer = [];

  try {
    await apiPost("/api/events/batch", { events: eventsToSend });
  } catch {
    // On failure, move to retry buffer (with size limit)
    retryBuffer = eventsToSend.slice(-MAX_RETRY_BUFFER);
  }
}
