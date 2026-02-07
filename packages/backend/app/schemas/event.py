from datetime import datetime
from pydantic import BaseModel


class SessionCreate(BaseModel):
    id: str
    project_id: int | None = None


class SessionUpdate(BaseModel):
    end_time: datetime | None = None
    token_usage: dict | None = None
    summary: str | None = None


class SessionResponse(BaseModel):
    id: str
    project_id: int | None
    start_time: datetime
    end_time: datetime | None
    token_usage: dict | None
    summary: str | None

    model_config = {"from_attributes": True}


class EventCreate(BaseModel):
    session_id: str
    event_type: str
    timestamp: datetime | None = None
    payload: dict | None = None


class BatchEventCreate(BaseModel):
    events: list[EventCreate]


class EventResponse(BaseModel):
    id: int
    session_id: str
    event_type: str
    timestamp: datetime
    payload: dict | None

    model_config = {"from_attributes": True}


class AgentExecutionCreate(BaseModel):
    session_id: str
    agent_type: str
    model: str
    task_description: str | None = None


class ToolCallBatchCreate(BaseModel):
    tool_calls: list[dict]


class FileChangeBatchCreate(BaseModel):
    file_changes: list[dict]


class ErrorCreate(BaseModel):
    session_id: str
    error_type: str
    message: str
    stack_trace: str | None = None
