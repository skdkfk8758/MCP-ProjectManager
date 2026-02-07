from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from app.database import get_db
from app.models.project import Project
from app.models.task import Task
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services.websocket import manager

router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.updated_at.desc()))
    projects = result.scalars().all()
    responses = []
    for p in projects:
        task_result = await db.execute(
            select(sa_func.count(Task.id)).where(Task.project_id == p.id)
        )
        total = task_result.scalar() or 0
        done_result = await db.execute(
            select(sa_func.count(Task.id)).where(Task.project_id == p.id, Task.status == "done")
        )
        done = done_result.scalar() or 0
        responses.append(ProjectResponse(
            id=p.id, name=p.name, description=p.description, status=p.status,
            path=p.path, created_at=p.created_at, updated_at=p.updated_at,
            task_count=total, completed_task_count=done,
        ))
    return responses


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(name=data.name, description=data.description, path=data.path)
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Broadcast project creation
    await manager.broadcast("project", "created", {
        "id": project.id,
        "name": project.name,
        "status": project.status,
    })

    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        status=project.status, path=project.path,
        created_at=project.created_at, updated_at=project.updated_at,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    task_result = await db.execute(
        select(sa_func.count(Task.id)).where(Task.project_id == project.id)
    )
    total = task_result.scalar() or 0
    done_result = await db.execute(
        select(sa_func.count(Task.id)).where(Task.project_id == project.id, Task.status == "done")
    )
    done = done_result.scalar() or 0
    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        status=project.status, path=project.path,
        created_at=project.created_at, updated_at=project.updated_at,
        task_count=total, completed_task_count=done,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: int, data: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)

    # Broadcast project update
    await manager.broadcast("project", "updated", {
        "id": project.id,
        "name": project.name,
        "status": project.status,
    })

    return ProjectResponse(
        id=project.id, name=project.name, description=project.description,
        status=project.status, path=project.path,
        created_at=project.created_at, updated_at=project.updated_at,
    )


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()

    # Broadcast project deletion
    await manager.broadcast("project", "deleted", {"id": project_id})

    return {"deleted": True}
