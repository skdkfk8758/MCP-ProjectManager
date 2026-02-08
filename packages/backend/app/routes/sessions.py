from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from app.database import get_db
from app.models.event import Session, Event, TaskExecution
from app.models.task import Task
from app.schemas.event import (
    SessionCreate, SessionUpdate, SessionResponse,
    SessionListResponse, TaskExecutionCreate, TaskExecutionStop, TaskExecutionResponse,
)
from app.services.websocket import manager

router = APIRouter()


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(
        id=data.id,
        project_id=data.project_id,
        name=data.name,
        description=data.description,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    await manager.broadcast("session", "created", {
        "id": session.id,
        "project_id": session.project_id,
    })

    return session


@router.get("", response_model=list[SessionListResponse])
async def list_sessions(
    project_id: int | None = Query(None),
    active_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    # Subquery for event count
    event_count_sq = (
        select(Event.session_id, sa_func.count(Event.id).label("event_count"))
        .group_by(Event.session_id)
        .subquery()
    )
    # Subquery for active task count
    active_task_sq = (
        select(
            TaskExecution.session_id,
            sa_func.count(TaskExecution.id).label("active_task_count"),
        )
        .where(TaskExecution.status == "active")
        .group_by(TaskExecution.session_id)
        .subquery()
    )

    query = (
        select(
            Session,
            sa_func.coalesce(event_count_sq.c.event_count, 0).label("event_count"),
            sa_func.coalesce(active_task_sq.c.active_task_count, 0).label("active_task_count"),
        )
        .outerjoin(event_count_sq, Session.id == event_count_sq.c.session_id)
        .outerjoin(active_task_sq, Session.id == active_task_sq.c.session_id)
        .order_by(Session.start_time.desc())
        .limit(limit)
    )

    if project_id is not None:
        query = query.where(Session.project_id == project_id)
    if active_only:
        query = query.where(Session.end_time.is_(None))

    result = await db.execute(query)
    rows = result.all()

    return [
        SessionListResponse(
            id=row.Session.id,
            project_id=row.Session.project_id,
            name=row.Session.name,
            start_time=row.Session.start_time,
            end_time=row.Session.end_time,
            summary=row.Session.summary,
            event_count=row.event_count,
            active_task_count=row.active_task_count,
        )
        for row in rows
    ]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, data: SessionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    update_data = data.model_dump(exclude_unset=True)

    # If ending session, auto-abandon active task executions
    if "end_time" in update_data and update_data["end_time"] is not None:
        active_execs = await db.execute(
            select(TaskExecution)
            .where(TaskExecution.session_id == session_id, TaskExecution.status == "active")
        )
        for exec in active_execs.scalars().all():
            exec.status = "abandoned"
            exec.stopped_at = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(session, field, value)
    await db.commit()
    await db.refresh(session)

    await manager.broadcast("session", "updated", {
        "id": session.id,
        "project_id": session.project_id,
    })

    return session


@router.delete("/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()

    await manager.broadcast("session", "deleted", {"id": session_id})

    return {"deleted": True}


# --- Task Execution endpoints ---

@router.post("/{session_id}/tasks/{task_id}/start", response_model=TaskExecutionResponse)
async def start_task_work(
    session_id: str,
    task_id: int,
    data: TaskExecutionCreate | None = None,
    db: AsyncSession = Depends(get_db),
):
    # Verify session exists
    session_result = await db.execute(select(Session).where(Session.id == session_id))
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Check if task is already active in another session
    active_exec_result = await db.execute(
        select(TaskExecution).where(
            TaskExecution.task_id == task_id,
            TaskExecution.status == "active",
        )
    )
    active_exec = active_exec_result.scalar_one_or_none()
    if active_exec:
        raise HTTPException(
            status_code=409,
            detail=f"Task #{task_id} is already active in session {active_exec.session_id}",
        )

    # Create execution record
    execution = TaskExecution(
        task_id=task_id,
        session_id=session_id,
        notes=data.notes if data else None,
    )
    db.add(execution)

    # Update task status to in_progress
    task.status = "in_progress"

    await db.commit()
    await db.refresh(execution)

    await manager.broadcast("task_execution", "started", {
        "execution_id": execution.id,
        "task_id": task_id,
        "session_id": session_id,
    })

    return TaskExecutionResponse(
        id=execution.id,
        task_id=execution.task_id,
        session_id=execution.session_id,
        started_at=execution.started_at,
        stopped_at=execution.stopped_at,
        status=execution.status,
        notes=execution.notes,
        task_title=task.title,
    )


@router.post("/{session_id}/tasks/{task_id}/stop", response_model=TaskExecutionResponse)
async def stop_task_work(
    session_id: str,
    task_id: int,
    data: TaskExecutionStop | None = None,
    db: AsyncSession = Depends(get_db),
):
    # Find the active execution
    exec_result = await db.execute(
        select(TaskExecution).where(
            TaskExecution.task_id == task_id,
            TaskExecution.session_id == session_id,
            TaskExecution.status == "active",
        )
    )
    execution = exec_result.scalar_one_or_none()
    if not execution:
        raise HTTPException(
            status_code=404,
            detail=f"No active execution found for task #{task_id} in session {session_id}",
        )

    stop_status = data.status if data else "completed"
    if stop_status not in ("completed", "paused"):
        raise HTTPException(status_code=400, detail="Status must be 'completed' or 'paused'")

    execution.status = stop_status
    execution.stopped_at = datetime.now(timezone.utc)
    if data and data.notes:
        execution.notes = data.notes

    # Update task status based on stop status
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if task:
        if stop_status == "completed":
            task.status = "done"
        elif stop_status == "paused":
            task.status = "todo"

    await db.commit()
    await db.refresh(execution)

    await manager.broadcast("task_execution", "stopped", {
        "execution_id": execution.id,
        "task_id": task_id,
        "session_id": session_id,
        "status": stop_status,
    })

    return TaskExecutionResponse(
        id=execution.id,
        task_id=execution.task_id,
        session_id=execution.session_id,
        started_at=execution.started_at,
        stopped_at=execution.stopped_at,
        status=execution.status,
        notes=execution.notes,
        task_title=task.title if task else None,
    )


@router.get("/{session_id}/tasks", response_model=list[TaskExecutionResponse])
async def list_session_tasks(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TaskExecution, Task.title)
        .join(Task, TaskExecution.task_id == Task.id)
        .where(TaskExecution.session_id == session_id)
        .order_by(TaskExecution.started_at.desc())
    )
    rows = result.all()

    return [
        TaskExecutionResponse(
            id=row.TaskExecution.id,
            task_id=row.TaskExecution.task_id,
            session_id=row.TaskExecution.session_id,
            started_at=row.TaskExecution.started_at,
            stopped_at=row.TaskExecution.stopped_at,
            status=row.TaskExecution.status,
            notes=row.TaskExecution.notes,
            task_title=row.title,
        )
        for row in rows
    ]
