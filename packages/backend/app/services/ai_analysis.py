from datetime import timedelta, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func, and_
from app.models.task import Task
from app.models.event import Session, Error, AgentExecution
from app.models.project import Milestone


async def analyze_bottlenecks(db: AsyncSession, project_id: int | None = None):
    """Detect bottlenecks using rule-based analysis."""
    bottlenecks = []

    # Rule 1: Tasks stuck in_progress for 3+ days
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    query = select(Task).where(
        and_(Task.status == "in_progress", Task.updated_at < three_days_ago)
    )
    if project_id:
        query = query.where(Task.project_id == project_id)
    result = await db.execute(query)
    stuck_tasks = result.scalars().all()
    for task in stuck_tasks:
        days_stuck = (datetime.utcnow() - task.updated_at).days
        bottlenecks.append({
            "type": "stuck_task",
            "severity": "high" if days_stuck > 7 else "medium",
            "title": f"Task stuck for {days_stuck} days",
            "description": f"'{task.title}' has been in progress since {task.updated_at.strftime('%Y-%m-%d')}",
            "task_id": task.id,
            "suggestion": "Consider breaking this task into smaller subtasks or reassessing its scope.",
        })

    # Rule 2: Recurring errors (5+ in last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    error_counts = await db.execute(
        select(Error.error_type, sa_func.count(Error.id).label("count"))
        .where(Error.timestamp > week_ago)
        .group_by(Error.error_type)
        .having(sa_func.count(Error.id) >= 5)
    )
    for row in error_counts:
        bottlenecks.append({
            "type": "recurring_error",
            "severity": "high",
            "title": f"Recurring error: {row.error_type}",
            "description": f"'{row.error_type}' has occurred {row.count} times in the last 7 days",
            "suggestion": "Investigate the root cause. This error pattern may indicate a systemic issue.",
        })

    # Rule 3: Overdue milestones
    overdue_query = select(Milestone).where(
        and_(
            Milestone.due_date < datetime.utcnow(),
            Milestone.due_date.isnot(None),
            Milestone.status.in_(["pending", "in_progress"]),
        )
    )
    if project_id:
        overdue_query = overdue_query.where(Milestone.project_id == project_id)
    overdue_result = await db.execute(overdue_query)
    for milestone in overdue_result.scalars().all():
        days_overdue = (datetime.utcnow() - milestone.due_date).days
        bottlenecks.append({
            "type": "overdue_milestone",
            "severity": "critical" if days_overdue > 7 else "high",
            "title": f"Milestone overdue by {days_overdue} days",
            "description": f"'{milestone.title}' was due {milestone.due_date.strftime('%Y-%m-%d')}",
            "suggestion": "Review remaining tasks and adjust the milestone deadline or scope.",
        })

    # Rule 4: Slow agent performance (avg > 30s)
    slow_agents = await db.execute(
        select(
            AgentExecution.agent_type,
            sa_func.avg(
                sa_func.julianday(AgentExecution.end_time) - sa_func.julianday(AgentExecution.start_time)
            ).label("avg_duration_days"),
        )
        .where(AgentExecution.end_time.isnot(None))
        .group_by(AgentExecution.agent_type)
    )
    for row in slow_agents:
        if row.avg_duration_days and row.avg_duration_days * 86400 > 30:
            avg_secs = round(row.avg_duration_days * 86400, 1)
            bottlenecks.append({
                "type": "slow_agent",
                "severity": "medium",
                "title": f"Slow agent: {row.agent_type}",
                "description": f"Average execution time is {avg_secs}s",
                "suggestion": "Consider using a lighter model tier or optimizing the task prompt.",
            })

    return sorted(
        bottlenecks,
        key=lambda b: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(b["severity"], 4),
    )


async def suggest_next_tasks(db: AsyncSession, project_id: int | None = None):
    """Suggest which tasks to work on next."""
    suggestions = []

    # Priority 1: Critical priority tasks that are todo
    query = select(Task).where(
        and_(Task.status == "todo", Task.priority == "critical")
    )
    if project_id:
        query = query.where(Task.project_id == project_id)
    result = await db.execute(query.limit(5))
    for task in result.scalars().all():
        suggestions.append({
            "task_id": task.id,
            "title": task.title,
            "reason": "Critical priority - should be addressed immediately",
            "priority_score": 100,
        })

    # Priority 2: Tasks with approaching due dates
    three_days_future = datetime.utcnow() + timedelta(days=3)
    due_soon_query = select(Task).where(
        and_(
            Task.status.in_(["todo", "in_progress"]),
            Task.due_date.isnot(None),
            Task.due_date <= three_days_future,
        )
    )
    if project_id:
        due_soon_query = due_soon_query.where(Task.project_id == project_id)
    due_soon = await db.execute(due_soon_query.limit(5))
    for task in due_soon.scalars().all():
        if not any(s["task_id"] == task.id for s in suggestions):
            suggestions.append({
                "task_id": task.id,
                "title": task.title,
                "reason": f"Due date approaching: {task.due_date.strftime('%Y-%m-%d')}",
                "priority_score": 90,
            })

    # Priority 3: High priority todo tasks
    high_query = select(Task).where(
        and_(Task.status == "todo", Task.priority == "high")
    )
    if project_id:
        high_query = high_query.where(Task.project_id == project_id)
    result = await db.execute(high_query.limit(5))
    for task in result.scalars().all():
        if not any(s["task_id"] == task.id for s in suggestions):
            suggestions.append({
                "task_id": task.id,
                "title": task.title,
                "reason": "High priority task",
                "priority_score": 70,
            })

    # Priority 4: Stale tasks (30+ days without update)
    stale_date = datetime.utcnow() - timedelta(days=30)
    stale_query = select(Task).where(
        and_(Task.status.in_(["todo", "in_progress"]), Task.updated_at < stale_date)
    )
    if project_id:
        stale_query = stale_query.where(Task.project_id == project_id)
    stale = await db.execute(stale_query.limit(3))
    for task in stale.scalars().all():
        if not any(s["task_id"] == task.id for s in suggestions):
            suggestions.append({
                "task_id": task.id,
                "title": task.title,
                "reason": f"Stale for {(datetime.utcnow() - task.updated_at).days} days - consider cleanup",
                "priority_score": 30,
            })

    return sorted(suggestions, key=lambda s: s["priority_score"], reverse=True)


async def generate_report(db: AsyncSession, project_id: int | None = None):
    """Generate a summary report with recommendations."""
    # Task stats
    task_count_query = select(sa_func.count(Task.id))
    done_count_query = select(sa_func.count(Task.id)).where(Task.status == "done")
    if project_id:
        task_count_query = task_count_query.where(Task.project_id == project_id)
        done_count_query = done_count_query.where(Task.project_id == project_id)

    total_tasks = (await db.execute(task_count_query)).scalar() or 0
    done_tasks = (await db.execute(done_count_query)).scalar() or 0

    # Session stats (last 30 days)
    month_ago = datetime.utcnow() - timedelta(days=30)
    session_count = (await db.execute(
        select(sa_func.count(Session.id)).where(Session.start_time > month_ago)
    )).scalar() or 0

    # Error stats
    error_count = (await db.execute(
        select(sa_func.count(Error.id)).where(Error.timestamp > month_ago)
    )).scalar() or 0

    resolved_errors = (await db.execute(
        select(sa_func.count(Error.id)).where(
            and_(Error.timestamp > month_ago, Error.resolved == True)  # noqa: E712
        )
    )).scalar() or 0

    completion_rate = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0

    recommendations = []
    if completion_rate < 50:
        recommendations.append(
            "Task completion rate is below 50%. Consider prioritizing existing tasks before creating new ones."
        )
    if error_count > 10 and resolved_errors / max(error_count, 1) < 0.5:
        recommendations.append(
            f"Only {resolved_errors}/{error_count} errors resolved. Focus on error resolution."
        )
    if session_count < 5:
        recommendations.append("Low session activity. Consider scheduling regular coding sessions.")

    return {
        "period": "Last 30 days",
        "summary": {
            "total_tasks": total_tasks,
            "completed_tasks": done_tasks,
            "completion_rate": round(completion_rate, 1),
            "sessions": session_count,
            "errors": error_count,
            "resolved_errors": resolved_errors,
        },
        "recommendations": recommendations,
    }
