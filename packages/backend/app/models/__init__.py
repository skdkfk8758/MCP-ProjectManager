from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models so they register with Base.metadata
from app.models.project import Project, Milestone, Label, TaskLabel  # noqa: E402, F401
from app.models.task import Task, TaskDependency  # noqa: E402, F401
from app.models.event import (  # noqa: E402, F401
    Session,
    Event,
    AgentExecution,
    SkillInvocation,
    ToolCall,
    FileChange,
    Error,
)
from app.models.analytics import DailyStats, AgentUsageStats  # noqa: E402, F401
