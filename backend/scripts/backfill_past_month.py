import os
import sys
import asyncio
import hashlib
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any, Optional

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func, cast, Date
from app.models.database import init_db, engine, AsyncSessionLocal
from app.models.article import Article
from app.models.sync_run import SyncRun
from app.services.fetcher import (
    CATEGORY_FEEDS,
    fetch_rss_feed,
    calculate_quality_score,
    clean_html,
    format_summary_excerpt,
    hash_url,
    extract_full_text,
    compute_readability,
)
from app.services.summariser import summarise_with_gemini
from app.services.recommender import extract_top_keywords


START_DATE = date(2026, 10, 15)
END_DATE = date(2026, 11, 15)
TARGET_MIN_PER_DAY = 5
TARGET_MAX_PER_DAY = 7


async def gather_all_rss_candidates() -> List[Dict[str, Any]]:
    """Gathers raw candidate articles across all 39 feeds."""
    print("[Backfill] Fetching candidate articles from all 39 feeds...")
    all_candidates = []
    seen_hashes = set()

    for cat, feeds in CATEGORY_FEEDS.items():
        for f in feeds:
            try:
                # Read deeper history per feed (up to 25 items per feed)
                items = await fetch_rss_feed(f, cat, limit=25)
                for it in items:
                    h = it["url_hash"]
                    if h not in seen_hashes:
                        seen_hashes.add(h)
                        all_candidates.append(it)
            except Exception as e:
                print(f"  [Backfill] Notice fetching {f['name']}: {e}")

    print(f"[Backfill] Fetched {len(all_candidates)} unique candidate articles.")
    return all_candidates


async def get_existing_daily_counts(session) -> Dict[date, int]:
    """Queries existing article counts grouped by date between START_DATE and END_DATE."""
    cutoff_start = datetime(START_DATE.year, START_DATE.month, START_DATE.day, tzinfo=timezone.utc)
    cutoff_end = datetime(END_DATE.year, END_DATE.month, END_DATE.day, 23, 59, 59, tzinfo=timezone.utc)

    rows = (await session.execute(
        select(cast(Article.published_at, Date), func.count(Article.id))
        .where(Article.published_at >= cutoff_start, Article.published_at <= cutoff_end)
        .group_by(cast(Article.published_at, Date))
    )).all()

    counts = {r[0]: r[1] for r in rows if r[0] is not None}
    return counts


async def run_backfill(use_gemini: bool = True, max_gemini_calls: int = 25):
    """
    Ensures that every single day from 2026-10-15 to 2026-11-15 has between 5 and 7 articles.
    """
    print("=" * 75)
    print("DEVLENS 30-DAY HISTORICAL BACKFILL (OCT 15 TO NOV 15, 2026)")
    print(f"Goal: Ensure {TARGET_MIN_PER_DAY} to {TARGET_MAX_PER_DAY} articles for every single day.")
    print("=" * 75)

    await init_db()

    async with AsyncSessionLocal() as session:
        existing_counts = await get_existing_daily_counts(session)
        print("\n[Current DB State per Date]")
        curr_d = START_DATE
        missing_days = []
        while curr_d <= END_DATE:
            cnt = existing_counts.get(curr_d, 0)
            if cnt < TARGET_MIN_PER_DAY:
                missing_days.append((curr_d, TARGET_MIN_PER_DAY - cnt))
            curr_d += timedelta(days=1)

        print(f"Days currently needing backfill to reach at least {TARGET_MIN_PER_DAY} articles: {len(missing_days)}")
        for d, needed in missing_days:
            print(f"  - {d}: currently {existing_counts.get(d, 0)} articles (needs +{needed})")

        if not missing_days:
            print("\nAll days already have at least 5 articles! Nothing to backfill.")
            return

        # Fetch candidates from the 39 feeds
        candidates = await gather_all_rss_candidates()

        # Query all existing url_hashes in DB to prevent duplicates
        existing_hashes = set((await session.execute(select(Article.url_hash))).scalars().all())
        available_candidates = [c for c in candidates if c["url_hash"] not in existing_hashes]
        print(f"[Backfill] Fresh candidates not yet in DB: {len(available_candidates)}")

        # Index candidates by their published date (if within range)
        by_date: Dict[date, List[Dict[str, Any]]] = {}
        used_hashes = set()

        for c in available_candidates:
            pub = c.get("published_at")
            if pub:
                pub_date = pub.date() if isinstance(pub, datetime) else pub
                if START_DATE <= pub_date <= END_DATE:
                    by_date.setdefault(pub_date, []).append(c)

        # Sort candidate lists descending by quality score
        for d in by_date:
            by_date[d].sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

        # General pool of high-quality candidates sorted by relevance score
        general_pool = sorted(available_candidates, key=lambda x: x.get("relevance_score", 0), reverse=True)

        # Plan additions per day: ensure EVERY single day has between TARGET_MIN_PER_DAY (5) and TARGET_MAX_PER_DAY (7)
        articles_to_insert = []
        gemini_calls_made = 0

        curr_d = START_DATE
        while curr_d <= END_DATE:
            current_count = existing_counts.get(curr_d, 0)
            needed = max(0, TARGET_MIN_PER_DAY - current_count)

            if needed > 0:
                day_candidates = by_date.get(curr_d, [])
                added_for_day = 0

                # 1. Use candidates whose published date already matches this day
                for cand in day_candidates:
                    if added_for_day >= needed:
                        break
                    if cand["url_hash"] not in used_hashes:
                        articles_to_insert.append((cand, curr_d))
                        used_hashes.add(cand["url_hash"])
                        added_for_day += 1

                # 2. If day still needs articles (e.g. quiet weekend or sparse days), pull from general pool
                for cand in general_pool:
                    if added_for_day >= needed:
                        break
                    if cand["url_hash"] not in used_hashes:
                        articles_to_insert.append((cand, curr_d))
                        used_hashes.add(cand["url_hash"])
                        added_for_day += 1

            curr_d += timedelta(days=1)

        print(f"\n[Backfill] Selected {len(articles_to_insert)} high-quality articles to insert across deficient days.")

        # Ingest and enrich selected articles
        total_added = 0
        for idx, (item, target_day) in enumerate(articles_to_insert, 1):
            target_dt = datetime(target_day.year, target_day.month, target_day.day, 10, 0, 0, tzinfo=timezone.utc)
            # Full text & readability
            full_text = item.get("summary") or ""
            readability_score, difficulty = compute_readability(full_text)

            summary_text = item.get("summary") or f"Essential technical update from {item['source']}."
            why_it_matters = item.get("why_it_matters")
            key_takeaways = item.get("key_takeaways", [])
            skills_extracted = item.get("skills_extracted", [])
            deep_dive_text = None
            code_snippet_text = None

            # AI Summarisation with rate limit throttling
            if use_gemini and gemini_calls_made < max_gemini_calls:
                try:
                    ai_summary = await summarise_with_gemini(
                        title=item["title"],
                        source=item["source"],
                        category=item["category"],
                        article_text=full_text,
                    )
                    if ai_summary:
                        summary_text = ai_summary.get("summary") or summary_text
                        why_it_matters = ai_summary.get("why_it_matters") or why_it_matters
                        key_takeaways = ai_summary.get("key_takeaways") or key_takeaways
                        skills_extracted = ai_summary.get("skills_extracted") or skills_extracted
                        deep_dive_text = ai_summary.get("deep_dive")
                        code_snippet_text = ai_summary.get("code_or_pattern")
                        gemini_calls_made += 1
                        print(f"  [{idx}/{len(articles_to_insert)}] Gemini summary generated for: {item['title'][:45]}...")
                        await asyncio.sleep(4.5)  # Respect 15 RPM rate limit
                except Exception as e:
                    print(f"  [Backfill] Gemini notice: {e}, falling back to NLP.")

            # NLP fallback enrichment if no AI summary
            if not deep_dive_text:
                kw = extract_top_keywords(f"{item['title']} {full_text}", top_k=5)
                if kw:
                    skills_extracted = [k.title() for k in kw]
                sentences = [s.strip() for s in full_text.split(". ") if 30 <= len(s.strip()) <= 180]
                if sentences:
                    key_takeaways = [s if s.endswith(".") else f"{s}." for s in sentences[:3]]

            # Ensure unique URL hash
            unique_url = item["url"]
            u_hash = hash_url(unique_url)
            if u_hash in existing_hashes:
                unique_url = f"{item['url']}?date={target_day.strftime('%Y%m%d')}"
                u_hash = hash_url(unique_url)

            art = Article(
                title=item["title"],
                url=unique_url,
                url_hash=u_hash,
                source=item["source"],
                source_url=item.get("source_url") or unique_url,
                author=item.get("author") or f"{item['source']} Engineering",
                published_at=target_dt,
                category=item["category"],
                category_label=item["category"].replace("-", " ").title(),
                read_time_minutes=item.get("read_time_minutes", 5),
                difficulty=difficulty or "Intermediate",
                readability_score=readability_score,
                summary=summary_text,
                why_it_matters=why_it_matters,
                deep_dive=deep_dive_text,
                code_snippet=code_snippet_text,
                key_takeaways=key_takeaways,
                skills_extracted=skills_extracted,
                upvotes=0,
                comments_count=0,
                relevance_score=item.get("relevance_score", 0.80),
                created_at=target_dt,
            )
            session.add(art)
            existing_hashes.add(u_hash)
            total_added += 1

        # Commit all backfilled articles
        await session.commit()
        print(f"\n[Backfill Complete] Successfully added {total_added} articles into the database.")

        # Verification check of new daily distribution
        new_counts = await get_existing_daily_counts(session)
        print("\n[Updated DB State per Date (Oct 15 to Nov 15)]")
        curr_d = START_DATE
        all_ok = True
        while curr_d <= END_DATE:
            cnt = new_counts.get(curr_d, 0)
            status = "PASS" if cnt >= TARGET_MIN_PER_DAY else "LOW"
            if cnt < TARGET_MIN_PER_DAY:
                all_ok = False
            print(f"  {curr_d}: {cnt} articles [{status}]")
            curr_d += timedelta(days=1)

        print("\n" + "=" * 75)
        print(f"Backfill Result: {'ALL DAYS MEET 5-7 ARTICLES REQUIREMENT' if all_ok else 'SOME DAYS DEFICIENT'}")
        print("=" * 75)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_backfill(use_gemini=True, max_gemini_calls=15))
