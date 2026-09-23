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

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
