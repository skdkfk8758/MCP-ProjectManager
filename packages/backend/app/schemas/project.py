from datetime import datetime
from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    path: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    path: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    status: str
    path: str | None
    created_at: datetime
    updated_at: datetime
    task_count: int = 0
    completed_task_count: int = 0

    model_config = {"from_attributes": True}
