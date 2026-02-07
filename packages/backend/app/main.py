from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import projects, tasks, milestones, labels, sessions, events, analytics, ai, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="MCP Project Manager API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(milestones.router, prefix="/api/milestones", tags=["milestones"])
app.include_router(labels.router, prefix="/api/labels", tags=["labels"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(analytics.router, prefix="/api/dashboard", tags=["analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(ws.router, tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok"}
