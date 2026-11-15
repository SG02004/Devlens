import os
import sys
import pytest
from datetime import datetime, timezone, timedelta

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import get_seconds_until_next_6am_ist, has_today_6am_sync_run
from app.services.fetcher import fetch_articles_for_category

def test_seconds_until_next_6am_ist_calculation():
    """Verify precision scheduling for 6:00 AM IST (00:30 UTC)."""
    # Case 1: 00:00 UTC (before 00:30 UTC) -> should be 30 minutes away
    t1 = datetime(2026, 11, 15, 0, 0, 0, tzinfo=timezone.utc)
    sec1 = get_seconds_until_next_6am_ist(now=t1)
    assert sec1 == 1800, f"Expected 1800s, got {sec1}"

    # Case 2: 01:00 UTC (after 00:30 UTC) -> should be 23.5 hours away (84600s)
    t2 = datetime(2026, 11, 15, 1, 0, 0, tzinfo=timezone.utc)
    sec2 = get_seconds_until_next_6am_ist(now=t2)
    assert sec2 == 84600, f"Expected 84600s, got {sec2}"

    # Case 3: Live default call -> must be strictly within 1 second and 86400 seconds
    live_sec = get_seconds_until_next_6am_ist()
    assert 0 < live_sec <= 86400

@pytest.mark.asyncio
async def test_fetch_articles_with_min_published_at_filter():
    """Verify that fetch_articles_for_category respects min_published_at."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=36)
    articles = await fetch_articles_for_category(
        category="web-development",
        limit_per_source=2,
        min_published_at=cutoff,
    )
    for art in articles:
        if art.get("published_at"):
            assert art["published_at"] >= cutoff, (
                f"Article '{art['title']}' published at {art['published_at']} older than cutoff {cutoff}"
            )
