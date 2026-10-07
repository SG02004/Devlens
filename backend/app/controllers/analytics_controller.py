"""
Personal Learning Analytics Controller — Phase 3
Provides daily.dev-style developer reading telemetry:
  GET /api/analytics/me         → aggregate totals, streaks, 15-week heatmap, skill cloud, category velocity
  GET /api/analytics/me/history → paginated reading history with article metadata
"""

from collections import Counter
from datetime import datetime, timedelta, timezone, date
from typing import Set, List, Dict, Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.article import Article
from app.models.read_event import ReadEvent
from app.models.user import User
from app.services.fetcher import CATEGORY_FEEDS
from app.services.personalizer import READ_CUTOFF, _ensure_utc
from app.utils.security import get_current_user
from app.views.article_views import ArticleResponse

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

EPOCH_SENTINEL = datetime(1970, 1, 1, tzinfo=timezone.utc)
HEATMAP_DAYS = 105  # 15 weeks * 7 days


def _compute_streaks(read_dates: Set[date], today: date) -> tuple[int, int]:
    """
    Computes (current_streak, longest_streak) in consecutive UTC days.
    Current streak stays alive if the user read either today or yesterday
    (matching daily.dev / GitHub streak grace behavior).
    """
    if not read_dates:
        return 0, 0

    sorted_days = sorted(read_dates)

    # Longest streak
    longest = 1
    run = 1
    for i in range(1, len(sorted_days)):
        if (sorted_days[i] - sorted_days[i - 1]).days == 1:
            run += 1
            if run > longest:
                longest = run
        else:
            run = 1

    # Current streak (anchored at today, or yesterday if not read yet today)
    anchor = today if today in read_dates else (today - timedelta(days=1))
    if anchor not in read_dates:
        current = 0
    else:
        current = 0
        cursor = anchor
        while cursor in read_dates:
            current += 1
            cursor -= timedelta(days=1)

    return current, max(longest, current)


@router.get("/me")
async def get_my_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full personal learning analytics for the authenticated user.
    Executes a single joined query over ReadEvent + Article and aggregates
    in Python for dialect-agnostic speed across PostgreSQL and SQLite.
    """
    ev_query = (
        select(ReadEvent, Article)
        .outerjoin(Article, ReadEvent.article_id == Article.id)
        .where(ReadEvent.user_id == current_user.id)
        .order_by(desc(ReadEvent.read_at))
    )
    rows = (await db.execute(ev_query)).all()

    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.date()

    articles_read = 0
    bookmarks_count = 0
    minutes_read = 0
    today_reads = 0

    day_counts: Counter = Counter()
    category_counts: Counter = Counter()
    difficulty_counts: Dict[str, int] = {"Beginner": 0, "Intermediate": 0, "Advanced": 0}
    skill_counts: Counter = Counter()

    for ev, art in rows:
        ev_dt = _ensure_utc(ev.read_at, EPOCH_SENTINEL)
        is_read = ev_dt > READ_CUTOFF
        is_bookmarked = bool(ev.is_bookmarked)

        if is_bookmarked:
            bookmarks_count += 1

        if is_read:
            articles_read += 1
            ev_date = ev_dt.date()
            day_counts[ev_date] += 1
            if ev_date == today_utc:
                today_reads += 1

            if art is not None:
                minutes_read += int(art.read_time_minutes or 5)
                if art.category:
                    category_counts[art.category] += 1
                diff = art.difficulty if art.difficulty in difficulty_counts else "Intermediate"
                difficulty_counts[diff] += 1

                for s in (art.skills_extracted or []):
                    if s and isinstance(s, str) and s.strip():
                        skill_counts[s.strip()] += 1

    current_streak, longest_streak = _compute_streaks(set(day_counts.keys()), today_utc)

    # Build 105-day zero-filled heatmap (oldest -> newest ending today)
    start_date = today_utc - timedelta(days=HEATMAP_DAYS - 1)
    heatmap: List[Dict[str, Any]] = []
    for offset in range(HEATMAP_DAYS):
        d = start_date + timedelta(days=offset)
        heatmap.append({
            "date": d.isoformat(),
            "reads": day_counts.get(d, 0),
        })

    # Category breakdown across all 6 canonical categories
    all_categories = list(CATEGORY_FEEDS.keys())
    categories_payload = []
    top_category_label = "Artificial Intelligence"
    max_cat_reads = -1

    for cat_slug in all_categories:
        c_reads = category_counts.get(cat_slug, 0)
        label = cat_slug.replace("-", " ").title()
        pct = round((c_reads / articles_read) * 100) if articles_read > 0 else 0
        categories_payload.append({
            "category": cat_slug,
            "label": label,
            "reads": c_reads,
            "pct": pct,
        })
        if c_reads > max_cat_reads and c_reads > 0:
            max_cat_reads = c_reads
            top_category_label = label

    top_skills = [
        {"skill": skill, "count": count}
        for skill, count in skill_counts.most_common(12)
    ]

    return {
        "totals": {
            "articlesRead": articles_read,
            "bookmarks": bookmarks_count,
            "minutesRead": minutes_read,
            "currentStreak": current_streak,
            "longestStreak": longest_streak,
            "todayReads": today_reads,
            "topCategory": top_category_label,
        },
        "heatmap": heatmap,
        "categories": categories_payload,
        "difficulty": difficulty_counts,
        "topSkills": top_skills,
        "quiz": {
            "taken": current_user.quizzes_taken or 0,
            "avgScore": round(float(current_user.average_quiz_score or 0.0), 1),
        },
    }


@router.get("/me/history")
async def get_my_reading_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated reading history (articles actually read by the user),
    ordered most-recently-read first.
    """
    q = (
        select(ReadEvent, Article)
        .join(Article, ReadEvent.article_id == Article.id)
        .where(
            ReadEvent.user_id == current_user.id,
            ReadEvent.read_at > READ_CUTOFF,
        )
        .order_by(desc(ReadEvent.read_at))
        .offset(skip)
        .limit(limit)
    )
    rows = (await db.execute(q)).all()

    history = []
    for ev, art in rows:
        item = ArticleResponse.from_orm_article(
            art,
            is_bookmarked=bool(ev.is_bookmarked),
            is_read=True,
        ).model_dump(by_alias=True)
        item["readAt"] = _ensure_utc(ev.read_at, EPOCH_SENTINEL).isoformat()
        history.append(item)

    return {
        "history": history,
        "count": len(history),
    }
