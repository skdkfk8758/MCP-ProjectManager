from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.task import Task
from app.models.event import TaskExecution
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskStatusUpdate,
    TaskReorderRequest, TaskBulkUpdate, TaskResponse,
)
from app.schemas.event import TaskExecutionResponse
from app.services.websocket import manager

router = APIRouter()


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    project_id: int | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    execution_mode: str | None = Query(None),
    phase: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).order_by(Task.sort_order)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if execution_mode:
        query = query.where(Task.execution_mode == execution_mode)
    if phase:
        query = query.where(Task.phase == phase)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(data: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(**data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Broadcast task creation
    await manager.broadcast("task", "created", {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "project_id": task.project_id,
    })

    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, data: TaskUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    if task.status in ("done", "archived"):
        task.phase = None
    await db.commit()
    await db.refresh(task)

    # Broadcast task update
    await manager.broadcast("task", "updated", {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "project_id": task.project_id,
    })

    return task


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(task_id: int, data: TaskStatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = data.status
    if data.status in ("done", "archived"):
        task.phase = None
    await db.commit()
    await db.refresh(task)

    # Broadcast task status update
    await manager.broadcast("task", "updated", {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "project_id": task.project_id,
    })

    return task


@router.patch("/reorder")
async def reorder_tasks(items: list[TaskReorderRequest], db: AsyncSession = Depends(get_db)):
    for item in items:
        result = await db.execute(select(Task).where(Task.id == item.task_id))
        task = result.scalar_one_or_none()
        if task:
            task.sort_order = item.new_sort_order
            if item.new_status:
                task.status = item.new_status
    await db.commit()
    return {"updated": len(items)}


@router.patch("/bulk")
async def bulk_update(data: TaskBulkUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id.in_(data.task_ids)))
    tasks = result.scalars().all()
    for task in tasks:
        if data.status:
            task.status = data.status
        if data.priority:
            task.priority = data.priority
        if data.milestone_id is not None:
            task.milestone_id = data.milestone_id
    await db.commit()
    return {"updated": len(tasks)}


@router.delete("/{task_id}")
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()

    # Broadcast task deletion
    await manager.broadcast("task", "deleted", {"id": task_id})

    return {"deleted": True}


@router.get("/{task_id}/executions", response_model=list[TaskExecutionResponse])
async def list_task_executions(task_id: int, db: AsyncSession = Depends(get_db)):
    # Verify task exists
    task_result = await db.execute(select(Task).where(Task.id == task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    result = await db.execute(
        select(TaskExecution)
        .where(TaskExecution.task_id == task_id)
        .order_by(TaskExecution.started_at.desc())
    )
    executions = result.scalars().all()

    return [
        TaskExecutionResponse(
            id=e.id,
            task_id=e.task_id,
            session_id=e.session_id,
            started_at=e.started_at,
            stopped_at=e.stopped_at,
            status=e.status,
            notes=e.notes,
            task_title=task.title,
            ralph_state=e.ralph_state,
            execution_mode=task.execution_mode,
        )
        for e in executions
    ]
