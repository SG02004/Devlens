import hashlib
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
import feedparser

# Curated feeds per category (free, high-signal, no API key needed)
CATEGORY_FEEDS = {
    "web-development": [
        {"name": "CSS-Tricks", "url": "https://css-tricks.com/feed/", "type": "rss"},
        {"name": "web.dev", "url": "https://web.dev/feed.xml", "type": "rss"},
    ],
    "artificial-intelligence": [
        {"name": "arXiv cs.AI", "url": "http://export.arxiv.org/rss/cs.AI", "type": "rss"},
        {"name": "Hugging Face Blog", "url": "https://huggingface.co/blog/feed.xml", "type": "rss"},
        {"name": "OpenAI Blog", "url": "https://openai.com/news/rss.xml", "type": "rss"},
    ],
    "data-science": [
        {"name": "KDnuggets", "url": "https://www.kdnuggets.com/feed", "type": "rss"},
        {"name": "arXiv cs.LG", "url": "http://export.arxiv.org/rss/cs.LG", "type": "rss"},
    ],
    "cyber-security": [
        {"name": "The Hacker News", "url": "https://feeds.feedburner.com/TheHackersNews", "type": "rss"},
        {"name": "Bleeping Computer", "url": "https://www.bleepingcomputer.com/feed/", "type": "rss"},
        {"name": "Krebs on Security", "url": "https://krebsonsecurity.com/feed/", "type": "rss"},
    ],
    "cloud-computing": [
        {"name": "AWS News Blog", "url": "https://aws.amazon.com/blogs/aws/feed/", "type": "rss"},
        {"name": "Google Cloud Blog", "url": "https://cloudblog.withgoogle.com/rss/", "type": "rss"},
        {"name": "Azure Blog", "url": "https://azure.microsoft.com/en-us/blog/feed/", "type": "rss"},
    ],
    "devops": [
        {"name": "The New Stack", "url": "https://thenewstack.io/feed/", "type": "rss"},
        {"name": "CNCF Blog", "url": "https://www.cncf.io/blog/feed/", "type": "rss"},
        {"name": "Kubernetes Blog", "url": "https://kubernetes.io/feed.xml", "type": "rss"},
    ],
}

# Dev.to tags for direct REST API
DEVTO_TAG_MAP = {
    "web-development": "webdev",
    "artificial-intelligence": "ai",
    "data-science": "datascience",
    "cyber-security": "security",
    "cloud-computing": "cloud",
    "devops": "devops",
}

# Domain authority weights for quality ranking (0.70 to 0.95)
SOURCE_WEIGHTS = {
    "arXiv cs.AI": 0.92,
    "arXiv cs.LG": 0.92,
    "OpenAI Blog": 0.90,
    "Kubernetes Blog": 0.88,
    "CNCF Blog": 0.88,
    "Azure Blog": 0.86,
    "AWS News Blog": 0.86,
    "Google Cloud Blog": 0.86,
    "Krebs on Security": 0.86,
    "Hugging Face Blog": 0.85,
    "web.dev": 0.82,
    "The Hacker News": 0.82,
    "Bleeping Computer": 0.80,
    "The New Stack": 0.80,
    "CSS-Tricks": 0.78,
    "KDnuggets": 0.76,
    "Dev.to": 0.72,
}

# Minimum quality threshold to accept an article (discard junk/stale items)
QUALITY_THRESHOLD = 0.65

# Maximum articles per category per daily batch
MAX_ARTICLES_PER_DAY = 15


def clean_html(raw_html: str) -> str:
    """Removes HTML tags and normalizes whitespace."""
    if not raw_html:
        return ""
    clean = re.sub(r"<[^>]+>", "", raw_html)
    return " ".join(clean.split()).strip()


def format_summary_excerpt(raw_text: str, max_chars: int = 340) -> str:
    """Cleans HTML and trims gracefully at a sentence or word boundary."""
    clean = clean_html(raw_text)
    if not clean:
        return ""
    if len(clean) <= max_chars:
        return clean
    truncated = clean[:max_chars]
    last_period = truncated.rfind(". ")
    if last_period > 80:
        return truncated[:last_period + 1].strip()
    last_space = truncated.rfind(" ")
    if last_space > 80:
        return truncated[:last_space].strip() + "..."
    return truncated.strip() + "..."


def hash_url(url: str) -> str:
    """Computes SHA-256 hash of URL for deduplication."""
    norm_url = url.strip().lower()
    return hashlib.sha256(norm_url.encode("utf-8")).hexdigest()


def calculate_quality_score(
    source: str,
    published_at: Optional[datetime],
    title: str,
    summary: str,
    upvotes: int = 0,
) -> float:
    """
    Computes quality / relevance score (0.0 to 1.0):
    - Freshness (0.35): Within 24h = 1.0, 7d = 0.85, 30d = 0.60, older = 0.35
    - Source Authority (0.40): Trusted research & official engineering blogs get high weights
    - Content Substance (0.15): Title and summary length & completeness
    - Engagement (0.10): Upvotes/reactions normalized
    """
    now = datetime.now(timezone.utc)
    if published_at:
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - published_at).total_seconds() / (24 * 3600))
        if age_days <= 1:
            freshness = 1.0
        elif age_days <= 7:
            freshness = 0.85
        elif age_days <= 30:
            freshness = 0.60
        else:
            freshness = 0.35
    else:
        freshness = 0.50

    source_weight = SOURCE_WEIGHTS.get(source, 0.70)

    # Content substance: penalize empty/too-short summaries or single-word titles
    words_in_title = len(title.split())
    summary_len = len(summary.strip()) if summary else 0
    if words_in_title >= 4 and summary_len >= 80:
        content_substance = 1.0
    elif words_in_title >= 3 and summary_len >= 30:
        content_substance = 0.75
    else:
        content_substance = 0.40

    engagement = min(upvotes / 100.0, 1.0)

    score = (freshness * 0.35) + (source_weight * 0.40) + (content_substance * 0.15) + (engagement * 0.10)
    return round(min(score, 0.99), 3)


def select_quality_articles(
    articles: List[Dict[str, Any]],
    max_count: int = MAX_ARTICLES_PER_DAY,
    min_score: float = QUALITY_THRESHOLD,
) -> List[Dict[str, Any]]:
    """
    Quality gate:
    1. Filters out articles scoring below min_score (drops junk/stale items).
    2. Sorts descending by quality score.
    3. Caps at max_count (15 articles per category per day).
    If fewer articles meet the quality threshold, returns only those that qualify.
    """
    quality_articles = [a for a in articles if a.get("relevance_score", 0) >= min_score]
    quality_articles.sort(key=lambda a: a.get("relevance_score", 0), reverse=True)
    return quality_articles[:max_count]


async def fetch_devto_articles(category: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetches articles from Dev.to public REST API."""
    tag = DEVTO_TAG_MAP.get(category, "programming")
    api_url = f"https://dev.to/api/articles?tag={tag}&per_page={limit}"
    articles = []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(api_url, headers={"User-Agent": "DevLens/1.0"})
            if res.status_code == 200:
                data = res.json()
                for item in data:
                    url = item.get("url")
                    if not url:
                        continue
                    # Parse published_at
                    pub_date = None
                    raw_pub = item.get("published_at")
                    if raw_pub:
                        try:
                            pub_date = datetime.fromisoformat(raw_pub.replace("Z", "+00:00"))
                        except Exception:
                            pub_date = datetime.now(timezone.utc)

                    title = item.get("title", "").strip()
                    summary = format_summary_excerpt(item.get("description") or item.get("body_markdown", ""))
                    upvotes = item.get("positive_reactions_count", 0)

                    rel_score = calculate_quality_score(
                        source="Dev.to",
                        published_at=pub_date,
                        title=title,
                        summary=summary,
                        upvotes=upvotes,
                    )

                    articles.append({
                        "title": title,
                        "url": url,
                        "url_hash": hash_url(url),
                        "source": "Dev.to",
                        "source_url": url,
                        "author": item.get("user", {}).get("name", "Dev.to Author"),
                        "published_at": pub_date,
                        "category": category,
                        "read_time_minutes": item.get("reading_time_minutes", 5),
                        "difficulty": "Intermediate",
                        "summary": summary or f"Latest update on {title}.",
                        "why_it_matters": f"Trending community post in {category.replace('-', ' ').title()} with active developer engagement.",
                        "key_takeaways": [tag.strip() for tag in item.get("tag_list", []) if tag][:4],
                        "skills_extracted": item.get("tag_list", [])[:5],
                        "upvotes": upvotes,
                        "comments_count": item.get("comments_count", 0),
                        "relevance_score": rel_score,
                    })
    except Exception as e:
        print(f"[Fetcher] Error fetching Dev.to for {category}: {e}")

    return articles


async def fetch_rss_feed(feed_info: Dict[str, str], category: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetches and parses an RSS feed using feedparser."""
    url = feed_info["url"]
    source_name = feed_info["name"]
    articles = []

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            res = await client.get(url, headers={"User-Agent": "DevLens/1.0 (RSS Aggregator)"})
            if res.status_code != 200:
                return []
            content = res.text

        feed = feedparser.parse(content)
        for entry in feed.entries[:limit]:
            link = entry.get("link")
            if not link:
                continue

            title = clean_html(entry.get("title", ""))
            raw_summary = entry.get("summary", entry.get("description", ""))
            summary = format_summary_excerpt(raw_summary)
            author = entry.get("author", f"{source_name} Editorial")

            # Parse published date
            published_at = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)

            rel_score = calculate_quality_score(
                source=source_name,
                published_at=published_at,
                title=title,
                summary=summary,
                upvotes=25,
            )

            articles.append({
                "title": title,
                "url": link,
                "url_hash": hash_url(link),
                "source": source_name,
                "source_url": link,
                "author": author,
                "published_at": published_at,
                "category": category,
                "read_time_minutes": max(3, len(summary.split()) // 30 or 5),
                "difficulty": "Intermediate",
                "summary": summary or f"Latest update from {source_name}.",
                "why_it_matters": f"Essential industry reporting covering {category.replace('-', ' ').title()} from {source_name}.",
                "key_takeaways": [
                    f"Published by {source_name}",
                    f"Domain category: {category.replace('-', ' ').title()}",
                ],
                "skills_extracted": [category.replace("-", " ").title(), source_name],
                "upvotes": 25,
                "comments_count": 0,
                "relevance_score": rel_score,
            })
    except Exception as e:
        print(f"[Fetcher] Error fetching RSS from {source_name}: {e}")

    return articles


async def fetch_articles_for_category(category: str, limit_per_source: int = 4) -> List[Dict[str, Any]]:
    """
    Fetches raw candidates from Dev.to and all category RSS feeds,
    applies quality scoring, enforces the quality threshold, and returns
    at most MAX_ARTICLES_PER_DAY (15) articles (or fewer if fewer qualify).
    """
    candidates = []

    # 1. Dev.to API
    devto_items = await fetch_devto_articles(category, limit=limit_per_source)
    candidates.extend(devto_items)

    # 2. RSS Feeds (including newly added OpenAI, Krebs, Azure, Kubernetes)
    feeds = CATEGORY_FEEDS.get(category, [])
    for f in feeds:
        rss_items = await fetch_rss_feed(f, category, limit=limit_per_source)
        candidates.extend(rss_items)

    # 3. Quality Gate & Daily Cap: Keep top-scoring articles passing threshold
    return select_quality_articles(candidates, max_count=MAX_ARTICLES_PER_DAY, min_score=QUALITY_THRESHOLD)
