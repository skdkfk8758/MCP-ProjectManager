from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.ai_analysis import analyze_bottlenecks, suggest_next_tasks, generate_report

router = APIRouter()


@router.post("/analyze/bottlenecks")
async def api_analyze_bottlenecks(
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    bottlenecks = await analyze_bottlenecks(db, project_id)
    return {"bottlenecks": bottlenecks, "count": len(bottlenecks)}


@router.post("/analyze/recommendations")
async def api_analyze_recommendations(
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    report = await generate_report(db, project_id)
    return report


@router.get("/suggestions/next-tasks")
async def api_suggest_next_tasks(
    project_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    suggestions = await suggest_next_tasks(db, project_id)
    return {"suggestions": suggestions, "count": len(suggestions)}
