from datetime import datetime
from pydantic import BaseModel


class SessionCreate(BaseModel):
    id: str
    project_id: int | None = None
    name: str | None = None
    description: str | None = None


class SessionUpdate(BaseModel):
    end_time: datetime | None = None
    token_usage: dict | None = None
    summary: str | None = None
    name: str | None = None
    description: str | None = None
    project_id: int | None = None


class SessionResponse(BaseModel):
    id: str
    project_id: int | None
    name: str | None = None
    description: str | None = None
    start_time: datetime
    end_time: datetime | None
    token_usage: dict | None
    summary: str | None

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    id: str
    project_id: int | None = None
    name: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    summary: str | None = None
    event_count: int = 0
    active_task_count: int = 0

    model_config = {"from_attributes": True}


class TaskExecutionCreate(BaseModel):
    notes: str | None = None


class TaskExecutionStop(BaseModel):
    status: str = "completed"  # completed/paused
    notes: str | None = None


class TaskExecutionResponse(BaseModel):
    id: int
    task_id: int
    session_id: str
    started_at: datetime
    stopped_at: datetime | None = None
    status: str
    notes: str | None = None
    task_title: str | None = None

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
