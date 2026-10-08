import hashlib
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
import feedparser

# Curated feeds per category (exclusively Phase 2+ vetted engineering & research feeds)
CATEGORY_FEEDS = {
    "web-development": [
        {"name": "Smashing Magazine", "url": "https://www.smashingmagazine.com/feed", "type": "rss"},
        {"name": "MDN Blog", "url": "https://developer.mozilla.org/en-US/blog/rss.xml", "type": "rss"},
        {"name": "Go Blog", "url": "https://go.dev/blog/feed.atom", "type": "rss"},
        {"name": "Node.js Blog", "url": "https://nodejs.org/en/feed/blog.xml", "type": "rss"},
    ],
    "artificial-intelligence": [
        {"name": "Google Research Blog", "url": "https://research.google/blog/rss/", "type": "rss"},
        {"name": "Google DeepMind", "url": "https://deepmind.google/blog/rss.xml", "type": "rss"},
        {"name": "Meta Engineering", "url": "https://engineering.fb.com/feed/", "type": "rss"},
        {"name": "Apple ML Research", "url": "https://machinelearning.apple.com/rss.xml", "type": "rss"},
    ],
    "data-science": [
        {"name": "Towards Data Science", "url": "https://towardsdatascience.com/feed", "type": "rss"},
        {"name": "Import AI", "url": "https://importai.substack.com/feed", "type": "rss"},
        {"name": "AWS Big Data Blog", "url": "https://aws.amazon.com/blogs/big-data/feed/", "type": "rss"},
    ],
    "cyber-security": [
        {"name": "SANS ISC", "url": "https://isc.sans.edu/rssfeed.xml", "type": "rss"},
        {"name": "CSO Online", "url": "https://www.csoonline.com/feed/", "type": "rss"},
        {"name": "Unit 42", "url": "https://unit42.paloaltonetworks.com/feed/", "type": "rss"},
        {"name": "Wired Security", "url": "https://www.wired.com/feed/category/security/latest/rss", "type": "rss"},
    ],
    "cloud-computing": [
        {"name": "Cloudflare Blog", "url": "https://blog.cloudflare.com/rss/", "type": "rss"},
        {"name": "InfoQ Cloud", "url": "https://feed.infoq.com/Cloud/news", "type": "rss"},
        {"name": "Netflix Tech Blog", "url": "https://netflixtechblog.com/feed", "type": "rss"},
    ],
    "devops": [
        {"name": "GitHub Blog", "url": "https://github.blog/feed/", "type": "rss"},
        {"name": "HashiCorp Blog", "url": "https://www.hashicorp.com/blog/feed.xml", "type": "rss"},
        {"name": "DevOps.com", "url": "https://devops.com/feed/", "type": "rss"},
        {"name": "Spotify Engineering", "url": "https://engineering.atspotify.com/feed/", "type": "rss"},
    ],
}

# Domain authority weights for quality ranking (0.74 to 0.92)
SOURCE_WEIGHTS = {
    # Premier research orgs & academic tier (0.90 - 0.92)
    "Google Research Blog": 0.92,
    "Google DeepMind": 0.92,
    "Apple ML Research": 0.90,
    # Core infrastructure & platform engineering (0.86 - 0.89)
    "Meta Engineering": 0.88,
    "Unit 42": 0.88,
    "SANS ISC": 0.86,
    "Cloudflare Blog": 0.86,
    "Netflix Tech Blog": 0.86,
    "GitHub Blog": 0.86,
    # Leading vendor & runtime authority (0.80 - 0.85)
    "HashiCorp Blog": 0.85,
    "AWS Big Data Blog": 0.85,
    "Node.js Blog": 0.84,
    "Go Blog": 0.84,
    "MDN Blog": 0.82,
    "Spotify Engineering": 0.82,
    "InfoQ Cloud": 0.80,
    # Industry & practitioner publications (0.74 - 0.79)
    "Towards Data Science": 0.78,
    "Smashing Magazine": 0.78,
    "CSO Online": 0.78,
    "Wired Security": 0.76,
    "Import AI": 0.76,
    "DevOps.com": 0.74,
}

# Minimum quality threshold to accept an article (discard junk/stale items)
QUALITY_THRESHOLD = 0.65

# Maximum articles per category per daily automated batch (admin manual curation fills the rest)
MAX_ARTICLES_PER_DAY = 7


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

    engagement = min(upvotes / 100.0, 1.0) if upvotes > 0 else 0.5

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
                        "upvotes": 0,
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

            # Parse published date (supports both RSS published_parsed and Atom updated_parsed)
            published_at = None
            parsed_time = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
            if parsed_time:
                published_at = datetime(*parsed_time[:6], tzinfo=timezone.utc)

            rel_score = calculate_quality_score(
                source=source_name,
                published_at=published_at,
                title=title,
                summary=summary,
                upvotes=0,
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
                "upvotes": 0,
                "comments_count": 0,
                "relevance_score": rel_score,
            })
    except Exception as e:
        print(f"[Fetcher] Error fetching RSS from {source_name}: {e}")

    return articles


async def fetch_articles_for_category(category: str, limit_per_source: int = 4) -> List[Dict[str, Any]]:
    """
    Fetches raw candidates from the category RSS feeds in CATEGORY_FEEDS,
    applies quality scoring, enforces the quality threshold, and returns
    at most MAX_ARTICLES_PER_DAY (7) articles (or fewer if fewer qualify).
    """
    candidates = []

    feeds = CATEGORY_FEEDS.get(category, [])
    for f in feeds:
        rss_items = await fetch_rss_feed(f, category, limit=limit_per_source)
        candidates.extend(rss_items)

    # Quality Gate & Daily Cap: Keep top-scoring articles passing threshold
    return select_quality_articles(candidates, max_count=MAX_ARTICLES_PER_DAY, min_score=QUALITY_THRESHOLD)


def extract_full_text(url: str, fallback: str = "") -> str:
    """
    Extracts the main article body text from a URL using trafilatura.
    Returns a clean plain-text string.
    Falls back to the provided RSS snippet if trafilatura fails or the
    site blocks scraping (behind paywall, JS-only, etc.).

    This is the Phase 2 full-text parsing feature — passes rich content
    to Gemini instead of the short RSS <description> snippet.
    """
    try:
        import trafilatura
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            extracted = trafilatura.extract(
                downloaded,
                include_comments=False,
                include_tables=False,
                no_fallback=False,
            )
            if extracted and len(extracted.strip()) > 100:
                return extracted.strip()
    except Exception as e:
        print(f"[Fetcher] trafilatura could not extract {url}: {e}")
    return fallback


def compute_readability(text: str) -> tuple[float, str]:
    """
    Uses textstat (local Python library, zero API calls) to score article reading ease.
    Returns (flesch_score, difficulty_label).
    Flesch Reading Ease: 0-30 = Very Difficult, 30-60 = Difficult/Advanced,
    60-80 = Standard/Intermediate, 80-100 = Easy/Beginner.
    """
    try:
        import textstat
        score = textstat.flesch_reading_ease(text)
        if score >= 80:
            difficulty = "Beginner"
        elif score >= 50:
            difficulty = "Intermediate"
        else:
            difficulty = "Advanced"
        return round(score, 2), difficulty
    except Exception:
        return 0.0, "Intermediate"

