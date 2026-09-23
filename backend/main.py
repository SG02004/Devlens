import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db, engine, AsyncSessionLocal
from app.controllers.auth_controller import router as auth_router
from app.controllers.health_controller import router as health_router
from app.controllers.article_controller import router as article_router, execute_article_sync


async def periodic_article_sync():
    """
    Background worker that runs on server boot and periodically every 12 hours.
    Fetches fresh articles without blocking request handling.
    """
    # Wait 5 seconds after startup to ensure application is fully initialized
    await asyncio.sleep(5)
    while True:
        try:
            print("[DevLens AutoSync] Checking and fetching fresh articles...")
            async with AsyncSessionLocal() as session:
                res = await execute_article_sync(db=session, limit_per_source=4)
                print(f"[DevLens AutoSync] {res.message}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[DevLens AutoSync] Notice: {e}")

        # Sleep for 12 hours (43200 seconds)
        await asyncio.sleep(12 * 3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Initializes database tables and starts background sync on startup.
    """
    print("[DevLens] Initializing database tables...")
    await init_db()
    print("[DevLens] Database tables initialized successfully.")

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
_extra_origins = [o.strip() for o in _env_origins.split(",") if o.strip()]

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register MVC Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(article_router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to DevLens API",
        "docs": "/docs",
        "health": "/api/health",
    }
