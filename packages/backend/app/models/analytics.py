from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Integer, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class DailyStats(Base):
    __tablename__ = "daily_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    date: Mapped[date] = mapped_column(Date)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    session_count: Mapped[int] = mapped_column(Integer, default=0)
    agent_calls: Mapped[int] = mapped_column(Integer, default=0)


class AgentUsageStats(Base):
    __tablename__ = "agent_usage_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    agent_type: Mapped[str] = mapped_column(String(100))
    model: Mapped[str] = mapped_column(String(50))
    date: Mapped[date] = mapped_column(Date)
    total_calls: Mapped[int] = mapped_column(Integer, default=0)
    avg_duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
