from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.event import Session
from app.schemas.event import SessionCreate, SessionUpdate, SessionResponse
from app.services.websocket import manager

router = APIRouter()


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(id=data.id, project_id=data.project_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Broadcast session creation
    await manager.broadcast("session", "created", {
        "id": session.id,
        "project_id": session.project_id,
    })

    return session


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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    await db.commit()
    await db.refresh(session)

    # Broadcast session update
    await manager.broadcast("session", "updated", {
        "id": session.id,
        "project_id": session.project_id,
    })

    return session
