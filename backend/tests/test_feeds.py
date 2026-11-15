import os
import sys
import pytest

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.fetcher import CATEGORY_FEEDS, SOURCE_WEIGHTS

def test_category_feeds_structure_and_completeness():
    """Verify that every category has at least 6 feeds and no broken feeds."""
    expected_categories = [
        "web-development",
        "artificial-intelligence",
        "data-science",
        "cyber-security",
        "cloud-computing",
        "devops",
    ]
    for cat in expected_categories:
        assert cat in CATEGORY_FEEDS, f"Missing category: {cat}"
        assert len(CATEGORY_FEEDS[cat]) >= 6, f"Category {cat} has fewer than 6 feeds: {len(CATEGORY_FEEDS[cat])}"

def test_devops_com_removed():
    """Ensure broken DevOps.com (HTTP 403 bot block) is completely removed."""
    devops_feed_names = [f["name"] for f in CATEGORY_FEEDS.get("devops", [])]
    assert "DevOps.com" not in devops_feed_names, "DevOps.com should be removed due to HTTP 403 anti-bot blocks"

def test_flagship_feeds_present():
    """Ensure all core high-signal flagship feeds are present."""
    all_feeds = {f["name"] for feeds in CATEGORY_FEEDS.values() for f in feeds}
    flagship_sources = [
        "Vercel Blog",
        "web.dev",
        "Hugging Face Blog",
        "OpenAI News",
        "Databricks Blog",
        "The Hacker News",
        "AWS News Blog",
        "CNCF Blog",
        "Kubernetes Blog",
    ]
    for src in flagship_sources:
        assert src in all_feeds, f"Flagship source '{src}' missing from CATEGORY_FEEDS"

def test_all_feeds_have_calibrated_weights():
    """Ensure every feed in CATEGORY_FEEDS has an explicit entry in SOURCE_WEIGHTS between 0.74 and 0.95."""
    for cat, feeds in CATEGORY_FEEDS.items():
        for f in feeds:
            name = f["name"]
            assert name in SOURCE_WEIGHTS, f"Feed '{name}' in '{cat}' lacks an entry in SOURCE_WEIGHTS"
            weight = SOURCE_WEIGHTS[name]
            assert 0.74 <= weight <= 0.95, f"Feed '{name}' has uncalibrated weight: {weight}"
