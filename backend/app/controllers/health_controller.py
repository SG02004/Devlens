from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
async def health_check():
    """Health check endpoint for status monitoring."""
    return {
        "status": "healthy",
        "service": "DevLens Backend API",
        "version": "1.0.0",
    }
