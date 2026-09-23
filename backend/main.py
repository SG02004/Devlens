import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db, engine
from app.controllers.auth_controller import router as auth_router
from app.controllers.health_controller import router as health_router
from app.controllers.article_controller import router as article_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Initializes database tables on application startup.
    """
    print("[DevLens] Initializing database tables...")
    await init_db()
    print("[DevLens] Database tables initialized successfully.")
    yield
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
