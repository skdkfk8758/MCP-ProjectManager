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
