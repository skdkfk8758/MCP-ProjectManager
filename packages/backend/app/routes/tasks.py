from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.task import Task
from app.schemas.task import (
    TaskCreate, TaskUpdate, TaskStatusUpdate,
    TaskReorderRequest, TaskBulkUpdate, TaskResponse,
)
from app.services.websocket import manager

router = APIRouter()


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    project_id: int | None = Query(None),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).order_by(Task.sort_order)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
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
