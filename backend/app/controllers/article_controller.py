import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.article import Article
from app.models.user import User
from app.models.read_event import ReadEvent
from app.utils.security import get_optional_user, get_current_user
from app.views.article_views import ArticleResponse, FeedResponse, SyncResponse
from app.services.fetcher import (
    fetch_articles_for_category,
    extract_full_text,
    compute_readability,
    CATEGORY_FEEDS,
    MAX_ARTICLES_PER_DAY,
)
from app.services.summariser import summarise_with_gemini
from app.services.personalizer import rank_articles_for_user, READ_CUTOFF, _ensure_utc

router = APIRouter(prefix="/api/articles", tags=["Articles"])

EPOCH_SENTINEL = datetime(1970, 1, 1, tzinfo=timezone.utc)


@router.get("", response_model=FeedResponse)
@router.get("/", response_model=FeedResponse)
@router.get("/feed", response_model=FeedResponse)
async def get_articles_feed(
    category: Optional[str] = Query("all", description="Filter by category slug or 'all'"),
    sort: Optional[str] = Query("for-you", description="Sort mode: for-you, popular, newest, discussed"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Returns paginated articles for the feed.
    - Supports sort modes: 'for-you' (hybrid personalization + diversity guard),
      'popular' (upvotes DESC), 'newest' (published_at DESC), 'discussed' (comments_count DESC).
    - Joins authenticated user's ReadEvent state to return persistent isRead/isBookmarked flags.
    """
    query = select(Article)

    if category and category != "all":
        query = query.where(Article.category == category)
    elif current_user and current_user.selected_categories and category == "all":
        query = query.where(Article.category.in_(current_user.selected_categories))

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total_count = total_result.scalar_one() or 0

    # Load user's read, bookmark & upvote state
    read_ids = set()
    bookmarked_ids = set()
    upvoted_ids = set()
    user_events_with_articles = []

    if current_user:
        ev_query = (
            select(ReadEvent, Article)
            .outerjoin(Article, ReadEvent.article_id == Article.id)
            .where(ReadEvent.user_id == current_user.id)
            .order_by(desc(ReadEvent.read_at))
        )
        ev_rows = (await db.execute(ev_query)).all()
        for ev, art in ev_rows:
            ev_dt = _ensure_utc(ev.read_at, EPOCH_SENTINEL)
            if ev_dt > READ_CUTOFF:
                read_ids.add(ev.article_id)
            if ev.is_bookmarked:
                bookmarked_ids.add(ev.article_id)
            if getattr(ev, "is_upvoted", False):
                upvoted_ids.add(ev.article_id)
            if art is not None and len(user_events_with_articles) < 100:
                user_events_with_articles.append((ev, art))

    sort_mode = (sort or "for-you").lower()

    if sort_mode == "popular":
        query = query.order_by(desc(Article.upvotes), desc(Article.relevance_score), desc(Article.created_at))
        result = await db.execute(query.offset(skip).limit(limit))
        articles = list(result.scalars().all())
    elif sort_mode == "discussed":
        query = query.order_by(desc(Article.comments_count), desc(Article.upvotes), desc(Article.relevance_score))
        result = await db.execute(query.offset(skip).limit(limit))
        articles = list(result.scalars().all())
    elif sort_mode == "newest":
        query = query.order_by(desc(Article.published_at), desc(Article.created_at))
        result = await db.execute(query.offset(skip).limit(limit))
        articles = list(result.scalars().all())
    else:
        # "for-you": Hybrid personalization ranking over candidate pool
        candidate_query = query.order_by(desc(Article.relevance_score), desc(Article.created_at)).limit(300)
        candidates = list((await db.execute(candidate_query)).scalars().all())
        ranked = rank_articles_for_user(
            articles=candidates,
            user=current_user,
            user_events=user_events_with_articles,
            read_article_ids=read_ids,
        )
        articles = ranked[skip : skip + limit]

    article_responses = [
        ArticleResponse.from_orm_article(
            a,
            is_bookmarked=(a.id in bookmarked_ids),
            is_read=(a.id in read_ids),
            is_upvoted=(a.id in upvoted_ids),
        )
        for a in articles
    ]

    return FeedResponse(
        articles=article_responses,
        items=article_responses,
        total=total_count,
        categories=list(CATEGORY_FEEDS.keys()),
        filter=category,
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article_by_id(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Returns detailed information for a single article."""
    query = select(Article).where(Article.id == article_id)
    result = await db.execute(query)
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    is_read = False
    is_bookmarked = False
    is_upvoted = False
    if current_user:
        ev = (
            await db.execute(
                select(ReadEvent).where(
                    ReadEvent.user_id == current_user.id,
                    ReadEvent.article_id == article.id,
                )
            )
        ).scalar_one_or_none()
        if ev:
            is_read = _ensure_utc(ev.read_at, EPOCH_SENTINEL) > READ_CUTOFF
            is_bookmarked = bool(ev.is_bookmarked)
            is_upvoted = bool(getattr(ev, "is_upvoted", False))

    return ArticleResponse.from_orm_article(
        article,
        is_bookmarked=is_bookmarked,
        is_read=is_read,
        is_upvoted=is_upvoted,
    )


@router.post("/{article_id}/toggle-read")
async def toggle_read_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Persists or toggles read status for an article via ReadEvent.
    Updates User.read_count and preserves bookmark/upvote status if present.
    """
    article = (await db.execute(select(Article).where(Article.id == article_id))).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    ev = (
        await db.execute(
            select(ReadEvent).where(
                ReadEvent.user_id == current_user.id,
                ReadEvent.article_id == article_id,
            )
        )
    ).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if ev is None:
        ev = ReadEvent(
            user_id=current_user.id,
            article_id=article_id,
            read_at=now,
            is_bookmarked=False,
            is_upvoted=False,
        )
        db.add(ev)
        is_read = True
        is_bookmarked = False
    else:
        was_read = _ensure_utc(ev.read_at, EPOCH_SENTINEL) > READ_CUTOFF
        if was_read:
            if ev.is_bookmarked or getattr(ev, "is_upvoted", False):
                ev.read_at = EPOCH_SENTINEL
                is_read = False
                is_bookmarked = bool(ev.is_bookmarked)
            else:
                await db.delete(ev)
                is_read = False
                is_bookmarked = False
        else:
            ev.read_at = now
            is_read = True
            is_bookmarked = bool(ev.is_bookmarked)

    await db.flush()

    read_count_q = (
        select(func.count())
        .select_from(ReadEvent)
        .where(ReadEvent.user_id == current_user.id, ReadEvent.read_at > READ_CUTOFF)
    )
    current_user.read_count = (await db.execute(read_count_q)).scalar_one() or 0
    await db.commit()

    return {
        "id": article_id,
        "isRead": is_read,
        "isBookmarked": is_bookmarked,
        "readCount": current_user.read_count,
    }


@router.post("/{article_id}/toggle-bookmark")
async def toggle_bookmark_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Persists or toggles bookmark status for an article via ReadEvent.
    Does not falsely mark unread articles as read when bookmarked.
    """
    article = (await db.execute(select(Article).where(Article.id == article_id))).scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    ev = (
        await db.execute(
            select(ReadEvent).where(
                ReadEvent.user_id == current_user.id,
                ReadEvent.article_id == article_id,
            )
        )
    ).scalar_one_or_none()

    if ev is None:
        ev = ReadEvent(
            user_id=current_user.id,
            article_id=article_id,
            read_at=EPOCH_SENTINEL,
            is_bookmarked=True,
            is_upvoted=False,
        )
        db.add(ev)
        is_read = False
        is_bookmarked = True
    else:
        was_read = _ensure_utc(ev.read_at, EPOCH_SENTINEL) > READ_CUTOFF
        if ev.is_bookmarked:
            if was_read or getattr(ev, "is_upvoted", False):
                ev.is_bookmarked = False
                is_read = was_read
                is_bookmarked = False
            else:
                await db.delete(ev)
                is_read = False
                is_bookmarked = False
        else:
            ev.is_bookmarked = True
            is_read = was_read
            is_bookmarked = True

    await db.commit()

    return {
        "id": article_id,
        "isRead": is_read,
        "isBookmarked": is_bookmarked,
    }


@router.post("/{article_id}/upvote")
async def upvote_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Toggles the authenticated user's upvote for an article (max 1 upvote per user).
    Recomputes the exact upvote count from ReadEvent so counts are always accurate.
    """
    query = select(Article).where(Article.id == article_id)
    result = await db.execute(query)
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    ev = (
        await db.execute(
            select(ReadEvent).where(
                ReadEvent.user_id == current_user.id,
                ReadEvent.article_id == article_id,
            )
        )
    ).scalar_one_or_none()

    if ev is None:
        ev = ReadEvent(
            user_id=current_user.id,
            article_id=article_id,
            read_at=EPOCH_SENTINEL,
            is_bookmarked=False,
            is_upvoted=True,
        )
        db.add(ev)
        is_upvoted = True
    else:
        was_read = _ensure_utc(ev.read_at, EPOCH_SENTINEL) > READ_CUTOFF
        if getattr(ev, "is_upvoted", False):
            if was_read or ev.is_bookmarked:
                ev.is_upvoted = False
            else:
                await db.delete(ev)
            is_upvoted = False
        else:
            ev.is_upvoted = True
            is_upvoted = True

    await db.flush()

    upvote_count_q = (
        select(func.count())
        .select_from(ReadEvent)
        .where(ReadEvent.article_id == article_id, ReadEvent.is_upvoted == True)  # noqa: E712
    )
    article.upvotes = (await db.execute(upvote_count_q)).scalar_one() or 0
    await db.commit()

    return {
        "id": article.id,
        "upvotes": article.upvotes,
        "isUpvoted": is_upvoted,
        "message": f"Article upvote {'added' if is_upvoted else 'removed'}. Total: {article.upvotes}",
    }


@router.get("/{article_id}/recommendations")
async def get_article_recommendations(
    article_id: str,
    limit: int = Query(3, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes content-based recommendations using local Scikit-Learn TF-IDF vectorization
    and Cosine Similarity across titles, summaries, and technical skills.
    Runs 100% locally with zero external API calls.
    """
    from app.services.recommender import calculate_recommendations

    # 1. Check target article
    target = (await db.execute(select(Article).where(Article.id == article_id))).scalar_one_or_none()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    # 2. Fetch recent candidate articles (up to 300 items)
    query = select(Article).order_by(desc(Article.created_at)).limit(300)
    result = await db.execute(query)
    candidate_articles = list(result.scalars().all())

    # Ensure target article is always in the candidate pool for indexing
    if not any(a.id == target.id for a in candidate_articles):
        candidate_articles.append(target)

    # 3. Compute pairwise TF-IDF Cosine Similarity
    recommendations = calculate_recommendations(
        target_article_id=article_id,
        articles=candidate_articles,
        top_n=limit,
    )

    return {
        "article_id": article_id,
        "recommendations": recommendations,
        "algorithm": "TF-IDF Vectorizer + Cosine Similarity (Scikit-Learn)",
        "count": len(recommendations),
    }


async def execute_article_sync(
    db: AsyncSession,
    category: Optional[str] = None,
    limit_per_source: int = 4,
) -> SyncResponse:
    """
    Executes the article sync pipeline:
    Fetches candidates, scores quality, enforces 15/day quota, deduplicates, and saves.
    Callable both from API endpoints and background schedulers.
    """
    categories_to_sync = [category] if category else list(CATEGORY_FEEDS.keys())
    total_fetched = 0
    total_added = 0
    errors = []

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    for cat in categories_to_sync:
        try:
            # Check how many articles were already saved today for this category
            count_q = select(func.count()).select_from(Article).where(
                Article.category == cat,
                Article.created_at >= today_start,
            )
            today_count = (await db.execute(count_q)).scalar_one() or 0
            quota_left = max(0, MAX_ARTICLES_PER_DAY - today_count)

            if quota_left <= 0:
                continue

            # Fetches candidates, scores quality, applies quality threshold, and ranks
            fetched_items = await fetch_articles_for_category(cat, limit_per_source=limit_per_source)
            total_fetched += len(fetched_items)

            cat_added = 0
            for item in fetched_items:
                if cat_added >= quota_left:
                    break

                # Deduplicate against Supabase
                check_q = select(Article.id).where(Article.url_hash == item["url_hash"])
                existing = (await db.execute(check_q)).scalar_one_or_none()

                if not existing:
                    summary_text = item.get("summary") or ""
                    why_it_matters = item.get("why_it_matters")
                    key_takeaways = item.get("key_takeaways", [])
                    skills_extracted = item.get("skills_extracted", [])
                    difficulty = item.get("difficulty", "Intermediate")

                    # Phase 2: Extract full article text (run in thread pool to avoid blocking async event loop)
                    full_text = await asyncio.get_event_loop().run_in_executor(
                        None, extract_full_text, item["url"], summary_text
                    )
                    text_for_processing = full_text or summary_text

                    # Local AI: textstat readability scoring (zero API calls)
                    readability_score, calculated_diff = compute_readability(text_for_processing)
                    if calculated_diff:
                        difficulty = calculated_diff

                    # If Gemini API key is configured, enhance with structured AI summary using enriched full text
                    ai_summary = await summarise_with_gemini(
                        title=item["title"],
                        source=item["source"],
                        category=item["category"],
                        article_text=text_for_processing,
                    )
                    if ai_summary:
                        summary_text = ai_summary.get("summary") or summary_text
                        why_it_matters = ai_summary.get("why_it_matters") or why_it_matters
                        key_takeaways = ai_summary.get("key_takeaways") or key_takeaways
                        skills_extracted = ai_summary.get("skills_extracted") or skills_extracted
                        if readability_score <= 0 and ai_summary.get("difficulty"):
                            difficulty = ai_summary.get("difficulty")
                    else:
                        from app.services.recommender import extract_top_keywords
                        from app.services.fetcher import format_summary_excerpt
                        if full_text and len(full_text) > len(summary_text):
                            summary_text = format_summary_excerpt(full_text, max_chars=420)
                        kw = extract_top_keywords(f"{item['title']} {text_for_processing}", top_k=5)
                        if kw:
                            skills_extracted = [k.title() for k in kw]
                        sentences = [
                            s.strip()
                            for s in text_for_processing.replace("\n", " ").split(". ")
                            if 40 <= len(s.strip()) <= 180
                        ]
                        if len(sentences) >= 2:
                            key_takeaways = [s if s.endswith(".") else f"{s}." for s in sentences[:3]]

                    new_art = Article(
                        title=item["title"],
                        url=item["url"],
                        url_hash=item["url_hash"],
                        source=item["source"],
                        source_url=item.get("source_url"),
                        author=item.get("author"),
                        published_at=item.get("published_at"),
                        category=item["category"],
                        category_label=item["category"].replace("-", " ").title(),
                        read_time_minutes=item.get("read_time_minutes", 5),
                        difficulty=difficulty,
                        readability_score=readability_score,
                        summary=summary_text,
                        why_it_matters=why_it_matters,
                        key_takeaways=key_takeaways,
                        skills_extracted=skills_extracted,
                        upvotes=item.get("upvotes", 0),
                        comments_count=item.get("comments_count", 0),
                        relevance_score=item.get("relevance_score", 0.7),
                    )
                    db.add(new_art)
                    total_added += 1
                    cat_added += 1

            await db.commit()
        except Exception as e:
            errors.append(f"Error syncing {cat}: {str(e)}")

    return SyncResponse(
        message=f"Sync completed successfully. Evaluated quality candidates, saved {total_added} new articles (daily cap: {MAX_ARTICLES_PER_DAY}/category).",
        articles_fetched=total_fetched,
        articles_added=total_added,
        errors=errors,
    )


@router.post("/sync", response_model=SyncResponse)
async def sync_articles(
    category: Optional[str] = Query(None, description="Sync specific category or all"),
    limit_per_source: int = Query(4, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers on-demand article collection from Dev.to and high-signal RSS feeds.
    Enforces quality filtering and caps ingestion at MAX_ARTICLES_PER_DAY (15)
    per category per day (or fewer if fewer qualify). Deduplicates via SHA-256 url_hash.
    """
    return await execute_article_sync(db=db, category=category, limit_per_source=limit_per_source)

