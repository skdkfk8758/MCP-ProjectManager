from datetime import date, datetime
from pydantic import BaseModel


class DashboardOverview(BaseModel):
    total_projects: int
    active_tasks: int
    completion_rate: float
    today_sessions: int
    total_tokens_used: int
    recent_activity: list[dict]


class TrendData(BaseModel):
    dates: list[str]
    tasks_completed: list[int]
    tokens_used: list[int]
    session_counts: list[int]


class AgentStatsResponse(BaseModel):
    agent_type: str
    model: str
    total_calls: int
    avg_duration_ms: float
    success_rate: float


class ActivityItem(BaseModel):
    id: int
    type: str
    timestamp: datetime
    payload: dict | None = None
    session_id: str | None = None
    session_name: str | None = None


class ActivityListResponse(BaseModel):
    items: list[ActivityItem]
    total: int
    limit: int
    offset: int
