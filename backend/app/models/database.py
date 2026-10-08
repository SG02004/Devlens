from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.utils.config import settings

db_url = settings.async_database_url

# Configure engine arguments based on dialect
if "sqlite" in db_url:
    engine = create_async_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    # PostgreSQL / Supabase configuration
    engine = create_async_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
        echo=False,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for yielding async database sessions in FastAPI routes."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


from sqlalchemy import inspect, text


def _ensure_columns(sync_conn):
    """Idempotently adds Phase 2/3 columns to existing tables if missing."""
    inspector = inspect(sync_conn)
    tables = inspector.get_table_names()
    if "users" in tables:
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        if "role" not in user_cols:
            sync_conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"))
    if "articles" in tables:
        art_cols = {c["name"] for c in inspector.get_columns("articles")}
        if "readability_score" not in art_cols:
            sync_conn.execute(text("ALTER TABLE articles ADD COLUMN readability_score FLOAT NOT NULL DEFAULT 0.0"))


async def init_db():
    """Initializes and creates all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_columns)
