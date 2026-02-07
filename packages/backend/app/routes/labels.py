from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.project import Label
from pydantic import BaseModel

router = APIRouter()


class LabelCreate(BaseModel):
    name: str
    color: str = "#6366f1"


class LabelResponse(BaseModel):
    id: int
    name: str
    color: str
    model_config = {"from_attributes": True}


@router.get("", response_model=list[LabelResponse])
async def list_labels(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Label))
    return result.scalars().all()


@router.post("", response_model=LabelResponse, status_code=201)
async def create_label(data: LabelCreate, db: AsyncSession = Depends(get_db)):
    label = Label(name=data.name, color=data.color)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return label
