from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.article import Article
from app.models.user import User
from app.utils.security import get_optional_user
from app.views.article_views import ArticleResponse, FeedResponse, SyncResponse
from app.services.fetcher import fetch_articles_for_category, CATEGORY_FEEDS, MAX_ARTICLES_PER_DAY
from app.services.summariser import summarise_with_gemini

router = APIRouter(prefix="/api/articles", tags=["Articles"])


@router.get("", response_model=FeedResponse)
@router.get("/", response_model=FeedResponse)
@router.get("/feed", response_model=FeedResponse)
async def get_articles_feed(
    category: Optional[str] = Query("all", description="Filter by category slug or 'all'"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Returns paginated articles for the feed.
    - If category is specified (e.g. 'web-development'), filters by that category.
    - If category is 'all' and user has preferred categories, prioritizes those.
    - Orders by relevance_score descending, then published_at descending.
    """
    query = select(Article)

    if category and category != "all":
        query = query.where(Article.category == category)
    elif current_user and current_user.selected_categories and category == "all":
        # Filter by user's preferred categories
        query = query.where(Article.category.in_(current_user.selected_categories))

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total_count = total_result.scalar_one() or 0

    # Order and paginate
    query = query.order_by(desc(Article.relevance_score), desc(Article.created_at))
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    articles = result.scalars().all()

    article_responses = [ArticleResponse.from_orm_article(a) for a in articles]

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

    return ArticleResponse.from_orm_article(article)


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

                    # If Gemini API key is configured, enhance with structured AI summary
                    ai_summary = await summarise_with_gemini(
                        title=item["title"],
                        source=item["source"],
                        category=item["category"],
                        article_text=summary_text,
                    )
                    if ai_summary:
                        summary_text = ai_summary.get("summary") or summary_text
                        why_it_matters = ai_summary.get("why_it_matters") or why_it_matters
                        key_takeaways = ai_summary.get("key_takeaways") or key_takeaways
                        skills_extracted = ai_summary.get("skills_extracted") or skills_extracted
                        difficulty = ai_summary.get("difficulty") or difficulty

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

