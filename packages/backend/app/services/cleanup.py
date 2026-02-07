from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from app.models.event import Event, ToolCall, Error, Session


async def cleanup_old_data(db: AsyncSession):
    """Clean up old data based on retention policies."""
    results = {}

    # Events: 90 days retention
    cutoff_events = datetime.utcnow() - timedelta(days=90)
    r = await db.execute(delete(Event).where(Event.timestamp < cutoff_events))
    results["events_deleted"] = r.rowcount

    # Tool calls: 60 days retention (via session start_time)
    cutoff_tools = datetime.utcnow() - timedelta(days=60)
    old_session_ids = await db.execute(
        select(Session.id).where(Session.start_time < cutoff_tools)
    )
    old_ids = [row[0] for row in old_session_ids.all()]
    if old_ids:
        r = await db.execute(
            delete(ToolCall).where(ToolCall.session_id.in_(old_ids))
        )
        results["tool_calls_deleted"] = r.rowcount
    else:
        results["tool_calls_deleted"] = 0

    # Errors: 180 days retention
    cutoff_errors = datetime.utcnow() - timedelta(days=180)
    r = await db.execute(delete(Error).where(Error.timestamp < cutoff_errors))
    results["errors_deleted"] = r.rowcount

    # Sessions: 365 days retention
    cutoff_sessions = datetime.utcnow() - timedelta(days=365)
    r = await db.execute(delete(Session).where(Session.start_time < cutoff_sessions))
    results["sessions_deleted"] = r.rowcount

    await db.commit()
    return results
