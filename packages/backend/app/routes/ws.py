from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await manager.send_personal(websocket, {"type": "pong"})
            elif msg_type == "subscribe":
                channels = data.get("channels", [])
                manager.subscribe(websocket, channels)
                await manager.send_personal(websocket, {
                    "type": "subscribed",
                    "channels": channels,
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
