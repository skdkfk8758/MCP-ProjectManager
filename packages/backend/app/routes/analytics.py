from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.models.event import Session, Event
from app.models.analytics import DailyStats, AgentUsageStats
from app.schemas.analytics import DashboardOverview, TrendData, AgentStatsResponse, ActivityListResponse, ActivityItem

router = APIRouter()


@router.get("/overview", response_model=DashboardOverview)
async def dashboard_overview(db: AsyncSession = Depends(get_db)):
    # Total projects
    total_projects = (await db.execute(select(sa_func.count(Project.id)))).scalar() or 0

    # Active tasks
    active_tasks = (await db.execute(
        select(sa_func.count(Task.id)).where(Task.status.in_(["todo", "in_progress"]))
    )).scalar() or 0

    # Completion rate
    total_tasks = (await db.execute(select(sa_func.count(Task.id)))).scalar() or 0
    done_tasks = (await db.execute(
        select(sa_func.count(Task.id)).where(Task.status == "done")
    )).scalar() or 0
    completion_rate = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    # Today's sessions
    today = date.today()
    today_sessions = (await db.execute(
        select(sa_func.count(Session.id)).where(
            sa_func.date(Session.start_time) == today
        )
    )).scalar() or 0

    # Recent events
    recent = await db.execute(
        select(Event).order_by(Event.timestamp.desc()).limit(20)
    )
    recent_activity = [
        {
            "id": e.id,
            "type": e.event_type,
            "timestamp": e.timestamp.isoformat(),
            "payload": e.payload,
        }
        for e in recent.scalars().all()
    ]

    return DashboardOverview(
        total_projects=total_projects,
        active_tasks=active_tasks,
        completion_rate=round(completion_rate, 1),
        today_sessions=today_sessions,
        total_tokens_used=0,
        recent_activity=recent_activity,
    )


@router.get("/trends", response_model=TrendData)
async def dashboard_trends(
    days: int = Query(30, ge=1, le=365),
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    start_date = date.today() - timedelta(days=days)
    query = select(DailyStats).where(DailyStats.date >= start_date)
    if project_id:
        query = query.where(DailyStats.project_id == project_id)
    query = query.order_by(DailyStats.date)

    result = await db.execute(query)
    stats = result.scalars().all()

    return TrendData(
        dates=[s.date.isoformat() for s in stats],
        tasks_completed=[s.tasks_completed for s in stats],
        tokens_used=[s.tokens_used for s in stats],
        session_counts=[s.session_count for s in stats],
    )


@router.get("/agent-stats", response_model=list[AgentStatsResponse])
async def agent_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    start_date = date.today() - timedelta(days=days)
    result = await db.execute(
        select(AgentUsageStats).where(AgentUsageStats.date >= start_date)
    )
    stats = result.scalars().all()

    # Aggregate by agent_type + model
    aggregated: dict[str, dict] = {}
    for s in stats:
        key = f"{s.agent_type}:{s.model}"
        if key not in aggregated:
            aggregated[key] = {
                "agent_type": s.agent_type,
                "model": s.model,
                "total_calls": 0,
                "total_duration": 0.0,
                "success_count": 0,
                "failure_count": 0,
            }
        agg = aggregated[key]
        agg["total_calls"] += s.total_calls
        agg["total_duration"] += s.avg_duration_ms * s.total_calls
        agg["success_count"] += s.success_count
        agg["failure_count"] += s.failure_count

    return [
        AgentStatsResponse(
            agent_type=v["agent_type"],
            model=v["model"],
            total_calls=v["total_calls"],
            avg_duration_ms=v["total_duration"] / v["total_calls"] if v["total_calls"] > 0 else 0,
            success_rate=v["success_count"] / (v["success_count"] + v["failure_count"]) * 100
            if (v["success_count"] + v["failure_count"]) > 0
            else 0,
        )
        for v in aggregated.values()
    ]


@router.get("/activities", response_model=ActivityListResponse)
async def list_activities(
    project_id: int | None = Query(None),
    event_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    # Base query with optional session join for session_name
    base_query = select(Event, Session.name.label("session_name")).outerjoin(
        Session, Event.session_id == Session.id
    )

    # Apply filters
    if event_type:
        base_query = base_query.where(Event.event_type == event_type)
    if project_id:
        base_query = base_query.where(Session.project_id == project_id)

    # Count total
    count_query = select(sa_func.count()).select_from(base_query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Fetch paginated results
    query = base_query.order_by(Event.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    items = [
        ActivityItem(
            id=row.Event.id,
            type=row.Event.event_type,
            timestamp=row.Event.timestamp,
            payload=row.Event.payload,
            session_id=row.Event.session_id,
            session_name=row.session_name,
        )
        for row in rows
    ]

    return ActivityListResponse(items=items, total=total, limit=limit, offset=offset)
