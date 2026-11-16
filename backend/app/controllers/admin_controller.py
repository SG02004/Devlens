"""
Admin Controller — Phase 2 + Phase 3
Provides endpoints exclusively for admin users:
  GET  /api/admin/stats                     → article counts + daily quota per category
  POST /api/admin/articles/fetch-candidates → fetches 3 scored candidates WITHOUT saving
  POST /api/admin/articles/approve          → saves an approved candidate to the DB
  GET  /api/admin/users                     → list all registered users
  PUT  /api/admin/users/{user_id}/role      → promote/demote a user's role
  GET  /api/admin/analytics                 → platform-wide aggregates

All endpoints require admin JWT (role='admin' in token payload).
"""

import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.article import Article
from app.models.user import User
from app.models.read_event import ReadEvent
from app.utils.security import require_admin
from app.services.fetcher import (
    fetch_articles_for_category,
    extract_full_text,
    compute_readability,
    CATEGORY_FEEDS,
    MAX_ARTICLES_PER_DAY,
)
from app.services.summariser import summarise_with_gemini

router = APIRouter(prefix="/api/admin", tags=["Admin"])

VALID_CATEGORIES = list(CATEGORY_FEEDS.keys())


# ─── GET /api/admin/stats ──────────────────────────────────────────────────────

@router.get("/stats")
async def get_admin_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns per-category article counts and today's ingestion quota usage.
    Used by the Admin Panel dashboard overview.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    stats = []

    for cat in VALID_CATEGORIES:
        total_q = select(func.count()).select_from(Article).where(Article.category == cat)
        total = (await db.execute(total_q)).scalar_one() or 0

        today_q = select(func.count()).select_from(Article).where(
            Article.category == cat,
            Article.created_at >= today_start,
        )
        today_count = (await db.execute(today_q)).scalar_one() or 0

        stats.append({
            "category": cat,
            "label": cat.replace("-", " ").title(),
            "total_articles": total,
            "added_today": today_count,
            "daily_auto_cap": MAX_ARTICLES_PER_DAY,
            "quota_remaining": max(0, MAX_ARTICLES_PER_DAY - today_count),
        })

    return {"stats": stats, "generated_at": datetime.now(timezone.utc).isoformat()}


# ─── POST /api/admin/articles/fetch-candidates ────────────────────────────────

class FetchCandidatesRequest(BaseModel):
    category: str
    limit: int = 3  # admin always gets 3 candidates to review


@router.post("/articles/fetch-candidates")
async def fetch_candidates(
    payload: FetchCandidatesRequest,
    _admin: User = Depends(require_admin),
):
    """
    Fetches up to 3 candidate articles for admin review.
    - Calls RSS + Dev.to fetcher (same pipeline as auto-sync).
    - Extracts full article text via trafilatura (falls back to RSS snippet).
    - Runs Gemini AI summarization on the full text.
    - Runs textstat local readability scoring (non-API ML feature).
    - Returns candidates to the frontend WITHOUT saving anything to DB.
      The admin reviews and explicitly approves each one.
    """
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown category '{payload.category}'. Valid options: {VALID_CATEGORIES}",
        )

    # Fetch scored candidates from RSS + Dev.to
    candidates_raw = await fetch_articles_for_category(payload.category, limit_per_source=3)

    if not candidates_raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No quality candidates found for this category right now. Try again later.",
        )

    # Process up to `limit` candidates concurrently
    async def process_candidate(item: Dict[str, Any]) -> Dict[str, Any]:
        url = item["url"]
        rss_snippet = item.get("summary", "")

        # Phase 2: Extract full article text (sync call run in thread pool to avoid blocking)
        full_text = await asyncio.get_event_loop().run_in_executor(
            None, extract_full_text, url, rss_snippet
        )

        # Local AI: textstat readability scoring (no API)
        text_for_scoring = full_text or rss_snippet
        readability_score, difficulty = compute_readability(text_for_scoring)

        # Gemini AI summarization (uses full text if available, snippet otherwise)
        ai_summary = await summarise_with_gemini(
            title=item["title"],
            source=item["source"],
            category=item["category"],
            article_text=text_for_scoring,
        )

        summary_text = item.get("summary", "")
        why_it_matters = item.get("why_it_matters", "")
        key_takeaways = item.get("key_takeaways", [])
        skills_extracted = item.get("skills_extracted", [])

        deep_dive_text = None
        code_snippet_text = None
        if ai_summary:
            summary_text = ai_summary.get("summary") or summary_text
            why_it_matters = ai_summary.get("why_it_matters") or why_it_matters
            key_takeaways = ai_summary.get("key_takeaways") or key_takeaways
            skills_extracted = ai_summary.get("skills_extracted") or skills_extracted
            deep_dive_text = ai_summary.get("deep_dive")
            code_snippet_text = ai_summary.get("code_or_pattern")
            if readability_score <= 0 and ai_summary.get("difficulty"):
                difficulty = ai_summary.get("difficulty")
        else:
            from app.services.recommender import extract_top_keywords
            from app.services.fetcher import format_summary_excerpt
            if full_text and len(full_text) > len(summary_text):
                summary_text = format_summary_excerpt(full_text, max_chars=420)
            kw = extract_top_keywords(f"{item['title']} {text_for_scoring}", top_k=5)
            if kw:
                skills_extracted = [k.title() for k in kw]

        return {
            # Temporary candidate ID (not persisted — just for frontend to track)
            "_candidate_id": uuid.uuid4().hex,
            "title": item["title"],
            "url": url,
            "url_hash": item["url_hash"],
            "source": item["source"],
            "author": item.get("author", ""),
            "published_at": item.get("published_at").isoformat() if item.get("published_at") else None,
            "category": item["category"],
            "category_label": item["category"].replace("-", " ").title(),
            "read_time_minutes": item.get("read_time_minutes", 5),
            "difficulty": difficulty,
            "summary": summary_text,
            "why_it_matters": why_it_matters,
            "deep_dive": deep_dive_text,
            "code_snippet": code_snippet_text,
            "full_content": full_text,
            "key_takeaways": key_takeaways,
            "skills_extracted": skills_extracted,
            "upvotes": item.get("upvotes", 0),
            "comments_count": item.get("comments_count", 0),
            "relevance_score": item.get("relevance_score", 0.7),
            "readability_score": readability_score,
            # Snippet of full text for admin preview (first 500 chars)
            "full_text_excerpt": (full_text or rss_snippet)[:500] if (full_text or rss_snippet) else "",
            "full_text_available": bool(full_text and len(full_text) > 100),
        }

    # Process candidates concurrently
    tasks = [process_candidate(c) for c in candidates_raw[:payload.limit]]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out any that errored
    candidates_out = [r for r in results if isinstance(r, dict)]

    if not candidates_out:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process candidates. Please try again.",
        )

    return {
        "category": payload.category,
        "candidates": candidates_out,
        "count": len(candidates_out),
    }


# ─── POST /api/admin/articles/approve ─────────────────────────────────────────

class ApproveArticleRequest(BaseModel):
    title: str
    url: str
    url_hash: str
    source: str
    author: Optional[str] = None
    published_at: Optional[str] = None
    category: str
    read_time_minutes: int = 5
    difficulty: str = "Intermediate"
    summary: Optional[str] = None
    why_it_matters: Optional[str] = None
    deep_dive: Optional[str] = None
    code_snippet: Optional[str] = None
    full_content: Optional[str] = None
    key_takeaways: List[str] = []
    skills_extracted: List[str] = []
    upvotes: int = 0
    comments_count: int = 0
    relevance_score: float = 0.7
    readability_score: float = 0.0


@router.post("/articles/approve", status_code=status.HTTP_201_CREATED)
async def approve_article(
    payload: ApproveArticleRequest,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Persists an admin-approved candidate article to the database.
    Checks for duplicates via url_hash before saving.
    """
    # Check for duplicate
    existing = (
        await db.execute(select(Article.id).where(Article.url_hash == payload.url_hash))
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This article already exists in the database.",
        )

    # Parse published_at
    pub_dt = None
    if payload.published_at:
        try:
            pub_dt = datetime.fromisoformat(payload.published_at.replace("Z", "+00:00"))
        except Exception:
            pub_dt = datetime.now(timezone.utc)

    article = Article(
        title=payload.title,
        url=payload.url,
        url_hash=payload.url_hash,
        source=payload.source,
        source_url=payload.url,
        author=payload.author,
        published_at=pub_dt,
        category=payload.category,
        category_label=payload.category.replace("-", " ").title(),
        read_time_minutes=payload.read_time_minutes,
        difficulty=payload.difficulty,
        summary=payload.summary,
        why_it_matters=payload.why_it_matters,
        deep_dive=payload.deep_dive,
        code_snippet=payload.code_snippet,
        full_content=payload.full_content,
        key_takeaways=payload.key_takeaways,
        skills_extracted=payload.skills_extracted,
        upvotes=payload.upvotes,
        comments_count=payload.comments_count,
        relevance_score=payload.relevance_score,
        readability_score=payload.readability_score,
    )

    db.add(article)
    await db.commit()
    await db.refresh(article)

    return {
        "message": f"Article '{article.title}' approved and saved successfully.",
        "article_id": article.id,
    }


# ─── GET /api/admin/users ─────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns all registered users ordered by join date descending.
    """
    result = await db.execute(
        select(User).order_by(desc(User.created_at))
    )
    users = result.scalars().all()

    return {
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": u.name or "",
                "role": u.role,
                "read_count": u.read_count,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ]
    }


# ─── PUT /api/admin/users/{user_id}/role ──────────────────────────────────────

VALID_ROLES = {"user", "admin"}


class UpdateRoleRequest(BaseModel):
    role: str


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UpdateRoleRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Promote or demote a user's role. Admin cannot demote themselves.
    """
    if payload.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.role}'. Must be one of: {sorted(VALID_ROLES)}",
        )

    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{user_id}' not found.",
        )

    target.role = payload.role
    await db.commit()
    await db.refresh(target)

    return {
        "message": f"User '{target.username}' role updated to '{payload.role}'.",
        "user_id": target.id,
        "new_role": target.role,
    }


# ─── GET /api/admin/analytics ─────────────────────────────────────────────────

@router.get("/analytics")
async def get_platform_analytics(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Platform-wide aggregates: user count, article counts by category,
    top-read articles, most active users.
    """
    # Total users
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one() or 0

    # Total articles
    total_articles = (await db.execute(select(func.count()).select_from(Article))).scalar_one() or 0

    # Articles per category
    articles_by_category = []
    for cat in VALID_CATEGORIES:
        count = (
            await db.execute(
                select(func.count()).select_from(Article).where(Article.category == cat)
            )
        ).scalar_one() or 0
        articles_by_category.append({
            "category": cat,
            "label": cat.replace("-", " ").title(),
            "count": count,
        })

    # Top 5 articles by upvotes (simple — no join needed)
    top_articles_result = await db.execute(
        select(Article.id, Article.title, Article.category, Article.upvotes)
        .order_by(desc(Article.upvotes))
        .limit(5)
    )
    top_articles = [
        {
            "id": row.id,
            "title": row.title,
            "category": row.category,
            "category_label": row.category.replace("-", " ").title(),
            "upvotes": row.upvotes or 0,
        }
        for row in top_articles_result.all()
    ]

    # Most active users by read_count
    most_active_result = await db.execute(
        select(User.username, User.name, User.read_count)
        .order_by(desc(User.read_count))
        .limit(5)
    )
    most_active_users = [
        {
            "username": row.username,
            "name": row.name or row.username,
            "read_count": row.read_count or 0,
        }
        for row in most_active_result.all()
    ]

    return {
        "total_users": total_users,
        "total_articles": total_articles,
        "articles_by_category": articles_by_category,
        "top_articles": top_articles,
        "most_active_users": most_active_users,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
