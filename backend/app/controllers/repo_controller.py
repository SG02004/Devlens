import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.repo import Repo
from app.models.user import User
from app.utils.security import require_admin
from app.views.repo_views import RepoResponse, TrendingReposResponse, RepoSyncResponse
from app.services.github_trending import execute_repo_sync

logger = logging.getLogger("devlens.repo_controller")

router = APIRouter(prefix="/api/repos", tags=["Trending Repositories"])


@router.get("/trending", response_model=TrendingReposResponse)
async def get_trending_repos(
    period: str = Query("daily", description="Trending period: daily, weekly, monthly"),
    language: Optional[str] = Query(None, description="Filter by programming language"),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated trending GitHub repositories sorted by trending velocity.
    Supports filtering by primary programming language and engineering category.
    """
    query = select(Repo)

    if language and language.lower() != "all":
        query = query.where(func.lower(Repo.primary_language) == language.lower())

    if category and category.lower() != "all":
        query = query.where(Repo.category == category.lower())

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar_one() or 0

    # Sort primarily by trending_score DESC, then stars_gained DESC
    query = query.order_by(desc(Repo.trending_score), desc(Repo.stars_gained), desc(Repo.stars))
    result = await db.execute(query.offset(skip).limit(limit))
    repos = list(result.scalars().all())

    items = [RepoResponse.model_validate(r) for r in repos]

    return TrendingReposResponse(
        items=items,
        total=total_count,
        period=period,
        language=language,
        category=category,
    )


@router.post("/sync", response_model=RepoSyncResponse)
async def sync_trending_repos(
    max_summaries: int = Query(10, ge=1, le=25),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Triggers on-demand ingestion of trending GitHub repositories (Admin only).
    Applies quality filtering, README hashing, and structured AI summarization.
    """
    result = await execute_repo_sync(db=db, max_summaries_per_run=max_summaries)
    return RepoSyncResponse(
        message=result.get("message", "Sync completed"),
        repos_fetched=result.get("repos_fetched", 0),
        repos_saved=result.get("repos_saved", 0),
        ai_summaries_generated=result.get("ai_summaries_generated", 0),
        errors=result.get("errors", []),
    )
