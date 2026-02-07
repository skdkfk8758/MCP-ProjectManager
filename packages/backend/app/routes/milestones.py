from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.project import Milestone
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class MilestoneCreate(BaseModel):
    project_id: int
    title: str
    description: str | None = None
    due_date: datetime | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    status: str | None = None


class MilestoneResponse(BaseModel):
    id: int
    project_id: int
    title: str
    description: str | None
    due_date: datetime | None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


@router.get("", response_model=list[MilestoneResponse])
async def list_milestones(
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Milestone)
    if project_id:
        query = query.where(Milestone.project_id == project_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=MilestoneResponse, status_code=201)
async def create_milestone(data: MilestoneCreate, db: AsyncSession = Depends(get_db)):
    milestone = Milestone(**data.model_dump())
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.get("/{milestone_id}", response_model=MilestoneResponse)
async def get_milestone(milestone_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone


@router.put("/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(milestone_id: int, data: MilestoneUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/{milestone_id}")
async def delete_milestone(milestone_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    await db.delete(milestone)
    await db.commit()
    return {"deleted": True}
