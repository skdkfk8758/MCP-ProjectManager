from __future__ import annotations
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Integer, Float, Boolean, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models import Base

if TYPE_CHECKING:
    from app.models.project import Project


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # UUID
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    token_usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped[Project | None] = relationship(back_populates="sessions")
    events: Mapped[list[Event]] = relationship(back_populates="session", lazy="selectin", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(50))
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    session: Mapped[Session] = relationship(back_populates="events")


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    agent_type: Mapped[str] = mapped_column(String(100))
    model: Mapped[str] = mapped_column(String(50))
    start_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running")  # running, completed, failed
    token_usage: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    task_description: Mapped[str | None] = mapped_column(Text, nullable=True)


class SkillInvocation(Base):
    __tablename__ = "skill_invocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    skill_name: Mapped[str] = mapped_column(String(100))
    trigger: Mapped[str] = mapped_column(String(20))  # auto, manual
    start_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running")


class ToolCall(Base):
    __tablename__ = "tool_calls"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    agent_execution_id: Mapped[int | None] = mapped_column(ForeignKey("agent_executions.id", ondelete="SET NULL"), nullable=True)
    tool_name: Mapped[str] = mapped_column(String(100))
    parameters: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True)


class FileChange(Base):
    __tablename__ = "file_changes"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    file_path: Mapped[str] = mapped_column(String(500))
    change_type: Mapped[str] = mapped_column(String(20))  # created, modified, deleted
    lines_added: Mapped[int] = mapped_column(Integer, default=0)
    lines_removed: Mapped[int] = mapped_column(Integer, default=0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Error(Base):
    __tablename__ = "errors"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    error_type: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    stack_trace: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
