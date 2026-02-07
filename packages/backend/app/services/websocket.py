import asyncio
import json
from datetime import datetime
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._subscriptions: dict[WebSocket, set[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self._subscriptions[websocket] = set()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self._subscriptions.pop(websocket, None)

    def subscribe(self, websocket: WebSocket, channels: list[str]):
        if websocket in self._subscriptions:
            self._subscriptions[websocket].update(channels)

    async def broadcast(self, message_type: str, action: str, data: dict):
        message = {
            "type": message_type,
            "action": action,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        disconnected = []
        for connection in self.active_connections:
            subs = self._subscriptions.get(connection, set())
            # Send if no subscriptions (send all) or type matches
            if not subs or message_type in subs:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def send_personal(self, websocket: WebSocket, data: dict):
        try:
            await websocket.send_json(data)
        except Exception:
            self.disconnect(websocket)


manager = ConnectionManager()
