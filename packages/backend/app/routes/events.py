from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.event import Event, AgentExecution, ToolCall, FileChange, Error
from app.schemas.event import (
    EventCreate, BatchEventCreate, EventResponse,
    AgentExecutionCreate, ToolCallBatchCreate, FileChangeBatchCreate, ErrorCreate,
)
from app.services.websocket import manager

router = APIRouter()


@router.post("", response_model=EventResponse, status_code=201)
async def create_event(data: EventCreate, db: AsyncSession = Depends(get_db)):
    event = Event(**data.model_dump())
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.post("/batch")
async def create_events_batch(data: BatchEventCreate, db: AsyncSession = Depends(get_db)):
    events = [Event(**e.model_dump()) for e in data.events]
    db.add_all(events)
    await db.commit()

    # Broadcast batch event creation
    await manager.broadcast("event", "batch_created", {"count": len(events)})

    return {"inserted": len(events), "failed": 0}


@router.post("/agent-executions", status_code=201)
async def create_agent_execution(data: AgentExecutionCreate, db: AsyncSession = Depends(get_db)):
    agent = AgentExecution(**data.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return {"id": agent.id}


@router.post("/tool-calls/batch")
async def create_tool_calls_batch(data: ToolCallBatchCreate, db: AsyncSession = Depends(get_db)):
    tool_calls = [ToolCall(**tc) for tc in data.tool_calls]
    db.add_all(tool_calls)
    await db.commit()
    return {"inserted": len(tool_calls)}


@router.post("/file-changes/batch")
async def create_file_changes_batch(data: FileChangeBatchCreate, db: AsyncSession = Depends(get_db)):
    changes = [FileChange(**fc) for fc in data.file_changes]
    db.add_all(changes)
    await db.commit()
    return {"inserted": len(changes)}


@router.post("/errors", status_code=201)
async def create_error(data: ErrorCreate, db: AsyncSession = Depends(get_db)):
    error = Error(**data.model_dump())
    db.add(error)
    await db.commit()
    await db.refresh(error)
    return {"id": error.id}
