from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    from app.models import Base

    async with engine.begin() as conn:
        # SQLite optimizations
        await conn.execute(
            __import__("sqlalchemy").text("PRAGMA journal_mode=WAL")
        )
        await conn.execute(
            __import__("sqlalchemy").text("PRAGMA foreign_keys=ON")
        )
        await conn.execute(
            __import__("sqlalchemy").text("PRAGMA busy_timeout=5000")
        )
        await conn.execute(
            __import__("sqlalchemy").text("PRAGMA synchronous=NORMAL")
        )
        await conn.execute(
            __import__("sqlalchemy").text("PRAGMA cache_size=-65536")
        )
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
