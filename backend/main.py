import asyncio
import os
from datetime import datetime, timezone, timedelta
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import init_db, engine, AsyncSessionLocal
from app.models.sync_run import SyncRun
from app.controllers.auth_controller import router as auth_router
from app.controllers.health_controller import router as health_router
from app.controllers.article_controller import router as article_router, execute_article_sync
from app.controllers.admin_controller import router as admin_router
from app.controllers.analytics_controller import router as analytics_router
from app.controllers.quiz_controller import router as quiz_router
from app.controllers.repo_controller import router as repo_router
from app.services.github_trending import execute_repo_sync


def get_seconds_until_next_6am_ist(now: Optional[datetime] = None) -> float:
    """
    Computes exact seconds until the next 6:00 AM IST (00:30 UTC).
    IST is UTC+05:30. 06:00 AM IST = 00:30 UTC.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    target = now.replace(hour=0, minute=30, second=0, microsecond=0)
    if now >= target:
        target += timedelta(days=1)
    return (target - now).total_seconds()


async def has_today_6am_sync_run(db: AsyncSession, now: Optional[datetime] = None) -> bool:
    """
    Checks if a successful sync has executed since today's 6:00 AM IST (00:30 UTC).
    If it is currently before 00:30 UTC, checks against yesterday's 00:30 UTC window.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    target_6am_utc = now.replace(hour=0, minute=30, second=0, microsecond=0)
    if now < target_6am_utc:
        target_6am_utc -= timedelta(days=1)

    query = select(func.count(SyncRun.id)).where(
        SyncRun.started_at >= target_6am_utc,
        SyncRun.status == "success",
    )
    count = (await db.execute(query)).scalar_one() or 0
    return count > 0


async def periodic_article_sync():
    """
    Background worker that runs on server boot and every day at 6:00 AM IST (00:30 UTC).
    Performs startup catch-up sync if today's 6:00 AM run was missed.
    Fetches fresh articles without blocking request handling.
    """
    # Wait 5 seconds after startup to ensure application is fully initialized
    await asyncio.sleep(5)

    # 1. Check if startup catch-up is needed
    try:
        async with AsyncSessionLocal() as session:
            already_run = await has_today_6am_sync_run(db=session)
            if not already_run:
                print("[DevLens AutoSync] Catch-up needed for today's 6:00 AM IST sync. Executing...")
                res = await execute_article_sync(db=session, limit_per_source=4, lookback_hours=36)
                print(f"[DevLens AutoSync Catch-up] {res.message}")
            else:
                print("[DevLens AutoSync] Today's 6:00 AM IST sync is already up-to-date.")
    except Exception as e:
        print(f"[DevLens AutoSync Catch-up Notice] {e}")

    # 2. Daily precision 6:00 AM IST loop
    while True:
        delay = get_seconds_until_next_6am_ist()
        hours_until = round(delay / 3600.0, 2)
        print(f"[DevLens AutoSync] Next scheduled sync at 6:00 AM IST ({hours_until}h from now). Sleeping...")
        try:
            await asyncio.sleep(delay)
        except asyncio.CancelledError:
            break

        try:
            print("[DevLens AutoSync] Running scheduled 6:00 AM IST daily article sync (rolling 36h window)...")
            async with AsyncSessionLocal() as session:
                res = await execute_article_sync(db=session, limit_per_source=4, lookback_hours=36)
                print(f"[DevLens AutoSync 6AM] {res.message}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[DevLens AutoSync 6AM Notice] {e}")

        try:
            print("[DevLens AutoSync] Checking and fetching trending GitHub repositories...")
            async with AsyncSessionLocal() as session:
                repo_res = await execute_repo_sync(db=session, max_summaries_per_run=5)
                print(f"[DevLens AutoSync Repos] {repo_res.get('message')}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[DevLens AutoSync Repos Notice] {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Initializes database tables and starts background sync on startup.
    """
    print("[DevLens] Initializing database tables...")
    try:
        await init_db()
        print("[DevLens] Database tables initialized successfully.")
    except Exception as e:
        print(f"[DevLens] Warning during database init: {e}")

    # Start automated background sync task
    sync_task = asyncio.create_task(periodic_article_sync())

    yield

    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        pass

    print("[DevLens] Disposing database connection pool...")
    await engine.dispose()


app = FastAPI(
    title="DevLens API",
    description="AI-powered technical learning platform backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS: Read allowed origins from env var CORS_ORIGINS (comma-separated).
# On Railway, set CORS_ORIGINS=https://your-frontend.up.railway.app
# Locally, falls back to standard dev ports.
_env_origins = os.getenv("CORS_ORIGINS", "")
_extra_origins = [o.strip().strip('"').strip("'") for o in _env_origins.split(",") if o.strip()]

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?|https://.*\.up\.railway\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    import traceback
    print(f"[DevLens Error] {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    origin = request.headers.get("origin", "")
    headers = {
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
    }
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    else:
        headers["Access-Control-Allow-Origin"] = "*"

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
        headers=headers,
    )

# Register MVC Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(article_router)
app.include_router(admin_router)
app.include_router(analytics_router)
app.include_router(quiz_router)
app.include_router(repo_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to DevLens API",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    from app.utils.config import settings

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)

