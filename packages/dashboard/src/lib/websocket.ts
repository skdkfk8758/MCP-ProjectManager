type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isIntentionallyClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;

          // Notify type-specific handlers
          const typeHandlers = this.handlers.get(type);
          if (typeHandlers) {
            typeHandlers.forEach(handler => handler(data));
          }

          // Notify wildcard handlers
          const allHandlers = this.handlers.get("*");
          if (allHandlers) {
            allHandlers.forEach(handler => handler(data));
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };
    } catch {
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  subscribe(channels: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", channels }));
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect();
    }, Math.min(delay, 30000));
  }
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:48293/ws";

export const wsClient = new WebSocketClient(WS_URL);
export type { MessageHandler };
