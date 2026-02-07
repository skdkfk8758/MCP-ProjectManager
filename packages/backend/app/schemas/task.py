from datetime import datetime
from pydantic import BaseModel


class TaskCreate(BaseModel):
    project_id: int
    milestone_id: int | None = None
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"
    sort_order: float = 0.0
    due_date: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    milestone_id: int | None = None
    sort_order: float | None = None
    due_date: datetime | None = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskReorderRequest(BaseModel):
    task_id: int
    new_status: str | None = None
    new_sort_order: float


class TaskBulkUpdate(BaseModel):
    task_ids: list[int]
    status: str | None = None
    priority: str | None = None
    milestone_id: int | None = None


class TaskResponse(BaseModel):
    id: int
    project_id: int
    milestone_id: int | None
    title: str
    description: str | None
    status: str
    priority: str
    sort_order: float
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
