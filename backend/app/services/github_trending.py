import hashlib
import logging
import re
from datetime import datetime, timezone, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
import httpx
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repo import Repo, RepoSnapshot
from app.utils.config import settings
from app.services.summariser import GEMINI_BASE_URL, GEMINI_MODELS

logger = logging.getLogger("devlens.github_trending")

OSS_INSIGHT_URL = "https://api.ossinsight.io/v1/trends/repos/"
GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"

SPAM_KEYWORDS = {
    "airdrop",
    "crypto-giveaway",
    "free-robux",
    "steam-key",
    "tiktok-bot",
    "cheats",
    "hack-tool",
    "crack-serial",
    "telegram-bot-earn",
}

CATEGORY_KEYWORDS = {
    "artificial-intelligence": [
        "ai", "llm", "machine-learning", "deep-learning", "nlp", "pytorch",
        "tensorflow", "transformers", "langchain", "vision", "rag", "agent",
        "diffusion", "vllm", "ollama", "neural",
    ],
    "cloud-computing": [
        "kubernetes", "k8s", "docker", "container", "aws", "gcp", "azure",
        "serverless", "distributed", "terraform", "consul", "vault", "istio",
    ],
    "devops": [
        "ci-cd", "github-actions", "monitoring", "observability", "devops",
        "prometheus", "grafana", "ansible", "helm", "opentofu", "pipeline",
    ],
    "cyber-security": [
        "security", "cybersecurity", "penetration-testing", "vulnerability",
        "crypto", "cryptography", "authentication", "authorization", "auth",
        "malware", "audit", "cve",
    ],
    "data-science": [
        "data", "analytics", "pandas", "dataframe", "etl", "sql", "spark",
        "duckdb", "polars", "big-data", "warehouse", "database",
    ],
    "web-development": [
        "react", "vue", "svelte", "nextjs", "tailwind", "css", "html",
        "javascript", "typescript", "frontend", "backend", "fastapi",
        "express", "node", "django", "flask", "web", "vite",
    ],
}


def is_awesome_list(name: str, description: Optional[str] = None, topics: Optional[List[str]] = None) -> bool:
    """Detects if a repo is a curated link collection (e.g. awesome-python) rather than runnable code."""
    n = name.lower()
    if n.startswith("awesome-") or "/awesome-" in n or n.endswith("-awesome") or n == "awesome":
        return True

    if description:
        d = description.lower()
        if "a curated list" in d or "curated list of" in d or "awesome list" in d:
            return True

    if topics:
        topic_set = {t.lower() for t in topics}
        if "awesome" in topic_set or "awesome-list" in topic_set:
            return True

    return False


def is_quality_repo(
    name: str,
    description: Optional[str] = None,
    is_fork: bool = False,
    is_archived: bool = False,
    topics: Optional[List[str]] = None,
) -> bool:
    """
    Enforces DevLens quality gate for GitHub repositories:
    1. Rejects forks and archived repos.
    2. Rejects repos with empty or trivial descriptions (<10 chars).
    3. Rejects awesome-* link curation lists (focuses on runnable tools and frameworks).
    4. Rejects spam / giveaway repositories.
    """
    if is_fork or is_archived:
        return False

    desc_clean = (description or "").strip()
    if len(desc_clean) < 10:
        return False

    if is_awesome_list(name, description, topics):
        return False

    # Check for spam keywords
    combined_text = f"{name} {desc_clean}".lower()
    for spam_word in SPAM_KEYWORDS:
        if spam_word in combined_text:
            return False

    return True


def infer_repo_category(
    name: str,
    description: Optional[str] = None,
    primary_language: Optional[str] = None,
    topics: Optional[List[str]] = None,
) -> str:
    """Maps repo metadata into one of DevLens 6 core engineering categories or 'open-source'."""
    text_corpus = f"{name} {description or ''} {primary_language or ''} {' '.join(topics or [])}".lower()
    scores: Dict[str, int] = {}

    for cat, kw_list in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in kw_list if re.search(rf"\b{re.escape(kw)}\b", text_corpus))
        if score > 0:
            scores[cat] = score

    if scores:
        return max(scores.items(), key=lambda kv: kv[1])[0]

    return "open-source"


async def fetch_oss_insight_trending(
    client: httpx.AsyncClient,
    period: str = "past_24_hours",
    language: str = "All",
) -> List[Dict[str, Any]]:
    """Fetches trending repositories from OSS Insight public API."""
    try:
        resp = await client.get(
            OSS_INSIGHT_URL,
            params={"period": period, "language": language},
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            rows = data.get("rows", [])
            items = []
            for r in rows:
                repo_id = r.get("repo_id")
                repo_name = r.get("repo_name")
                if not repo_id or not repo_name:
                    continue
                items.append({
                    "id": int(repo_id),
                    "full_name": repo_name,
                    "url": f"https://github.com/{repo_name}",
                    "description": r.get("description"),
                    "primary_language": r.get("language") or r.get("primary_language"),
                    "topics": [],
                    "license": None,
                    "stars": int(r.get("stars", 0)),
                    "forks": int(r.get("forks", 0)),
                    "stars_gained": int(r.get("star_increment", r.get("stars_increment", 0))),
                    "is_fork": False,
                    "is_archived": False,
                })
            return items
    except Exception as e:
        logger.warning(f"OSS Insight trending fetch failed: {e}")

    return []


async def fetch_github_search_trending(
    client: httpx.AsyncClient,
    days: int = 7,
    min_stars: int = 40,
    per_page: int = 30,
) -> List[Dict[str, Any]]:
    """
    Fallback trending retrieval using official GitHub Search API.
    Identifies surging newly created or actively starred repositories.
    """
    since = (date.today() - timedelta(days=days)).isoformat()
    query = f"created:>{since} stars:>{min_stars}"
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = settings.GITHUB_TOKEN.strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        resp = await client.get(
            GITHUB_SEARCH_URL,
            params={"q": query, "sort": "stars", "order": "desc", "per_page": per_page},
            headers=headers,
            timeout=12.0,
        )
        if resp.status_code == 200:
            raw_items = resp.json().get("items", [])
            items = []
            for item in raw_items:
                items.append({
                    "id": item["id"],
                    "full_name": item["full_name"],
                    "url": item.get("html_url") or f"https://github.com/{item['full_name']}",
                    "description": item.get("description"),
                    "primary_language": item.get("language"),
                    "topics": item.get("topics", []),
                    "license": (item.get("license") or {}).get("spdx_id") if isinstance(item.get("license"), dict) else None,
                    "stars": item.get("stargazers_count", 0),
                    "forks": item.get("forks_count", 0),
                    "stars_gained": max(10, item.get("stargazers_count", 0) // max(1, days)),
                    "is_fork": bool(item.get("fork", False)),
                    "is_archived": bool(item.get("archived", False)),
                })
            return items
        else:
            logger.warning(f"GitHub Search API returned status {resp.status_code}: {resp.text[:150]}")
    except Exception as e:
        logger.error(f"GitHub Search fallback failed: {e}")

    return []


async def fetch_repo_readme(
    client: httpx.AsyncClient,
    full_name: str,
    max_chars: int = 6000,
) -> Optional[str]:
    """Fetches the raw README text for a repository via GitHub API."""
    url = f"https://api.github.com/repos/{full_name}/readme"
    headers = {
        "Accept": "application/vnd.github.raw+json",
    }
    token = settings.GITHUB_TOKEN.strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        resp = await client.get(url, headers=headers, timeout=8.0)
        if resp.status_code == 200:
            return resp.text[:max_chars]
    except Exception as e:
        logger.warning(f"Could not fetch README for {full_name}: {e}")

    return None


REPO_SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {
            "type": "STRING",
            "description": "A crisp, technical 2-3 sentence explanation of the library/tool and what engineering problem it solves.",
        },
        "why_trending": {
            "type": "STRING",
            "description": "1-2 sentences on why this repository is surging in developer adoption right now (grounded in features and stars).",
        },
        "key_features": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "3-4 concise technical capabilities or architecture highlights.",
        },
        "good_for": {
            "type": "STRING",
            "description": "Target engineering audience or use case (e.g. Distributed systems engineers building microservices in Rust).",
        },
    },
    "required": ["summary", "why_trending", "key_features", "good_for"],
}


async def summarise_repo_with_gemini(
    repo_name: str,
    description: str,
    primary_language: Optional[str],
    topics: List[str],
    stars: int,
    stars_gained: int,
    readme_text: Optional[str],
) -> Dict[str, Any]:
    """
    Generates structured, grounded repository insights using Google Gemini.
    Falls back gracefully to deterministic heuristics if Gemini is offline or unconfigured.
    """
    api_key = settings.GEMINI_API_KEY.strip()
    clean_readme = (readme_text or "").strip()

    if api_key and (clean_readme or len(description.split()) >= 8):
        prompt = f"""You are a Principal Software Architect at DevLens analyzing trending open-source repositories.
Analyze the following repository and generate an insightful technical summary.

RULES:
1. Grounding: Summarize ONLY based on the facts in the provided description and README. Do NOT invent features, fake benchmarks, or unverified claims.
2. Tone: Engineering-first, precise, high-signal. Avoid marketing buzzwords.
3. Why Trending: Explain why developers are adopting this tool right now.
4. Good For: Describe the specific engineering persona and architectural use-case.

REPO: {repo_name}
PRIMARY LANGUAGE: {primary_language or 'Not specified'}
STARS: {stars} (Gained {stars_gained} recently)
TOPICS: {', '.join(topics) if topics else 'None'}
DESCRIPTION: {description}

README EXCERPT:
{clean_readme[:4000]}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
                "responseSchema": REPO_SUMMARY_SCHEMA,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            for model_id in GEMINI_MODELS:
                endpoint = f"{GEMINI_BASE_URL}/{model_id}:generateContent?key={api_key}"
                try:
                    res = await client.post(endpoint, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            if raw_text:
                                import json
                                parsed = json.loads(raw_text)
                                if "summary" in parsed:
                                    return parsed
                except Exception as e:
                    logger.warning(f"Gemini repo summarizer error with {model_id} for {repo_name}: {e}")

    # Deterministic fallback when Gemini is not configured or fails
    fallback_features = [t.replace("-", " ").title() for t in topics[:4]] if topics else [
        f"Built with {primary_language or 'modern standards'}",
        "Active open-source community",
        "Developer-first workflow",
    ]
    return {
        "summary": description,
        "why_trending": f"Surging in developer interest with {stars:,} total stars and active GitHub velocity.",
        "key_features": fallback_features[:4],
        "good_for": f"Software engineers and teams building with {primary_language or 'open source technology'}.",
    }


async def execute_repo_sync(
    db: AsyncSession,
    max_summaries_per_run: int = 10,
) -> Dict[str, Any]:
    """
    Executes full GitHub trending ingestion:
    1. Fetches candidates via OSS Insight (primary) -> GitHub Search (fallback).
    2. Applies quality filtering (drops forks, archived, awesome-* link lists, spam).
    3. Fetches READMEs and hashes content.
    4. Generates AI structured summaries (capped at max_summaries_per_run).
    5. Upserts into repos table and logs snapshot in repo_snapshots.
    """
    headers = {"User-Agent": "DevLens/1.0 (Developer Intelligence Platform)"}
    errors = []
    total_fetched = 0
    total_saved = 0
    ai_count = 0

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        # Step 1: Ingestion (Primary -> Fallback)
        candidates = await fetch_oss_insight_trending(client)
        if not candidates:
            logger.info("OSS Insight yielded 0 items, falling back to GitHub Search API")
            candidates = await fetch_github_search_trending(client)

        total_fetched = len(candidates)
        if not candidates:
            errors.append("Both OSS Insight and GitHub Search fallback returned no candidates.")
            return {
                "message": "No candidates retrieved",
                "repos_fetched": 0,
                "repos_saved": 0,
                "ai_summaries_generated": 0,
                "errors": errors,
            }

        today_date = date.today()
        now_utc = datetime.now(timezone.utc)

        for item in candidates:
            try:
                # Step 2: Quality Filtering Gate
                if not is_quality_repo(
                    name=item["full_name"],
                    description=item.get("description"),
                    is_fork=item.get("is_fork", False),
                    is_archived=item.get("is_archived", False),
                    topics=item.get("topics", []),
                ):
                    continue

                repo_id = item["id"]
                category = infer_repo_category(
                    name=item["full_name"],
                    description=item.get("description"),
                    primary_language=item.get("primary_language"),
                    topics=item.get("topics", []),
                )

                # Step 3: Check existing repo
                existing = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()

                readme_text = None
                readme_hash = None
                summary_data = None

                # Need AI summary if new or readme changed
                if existing is None or not existing.summary:
                    if ai_count < max_summaries_per_run:
                        readme_text = await fetch_repo_readme(client, item["full_name"])
                        if readme_text:
                            readme_hash = hashlib.sha256(readme_text.encode("utf-8")).hexdigest()
                        summary_data = await summarise_repo_with_gemini(
                            repo_name=item["full_name"],
                            description=item.get("description", ""),
                            primary_language=item.get("primary_language"),
                            topics=item.get("topics", []),
                            stars=item.get("stars", 0),
                            stars_gained=item.get("stars_gained", 0),
                            readme_text=readme_text,
                        )
                        ai_count += 1

                # Trending score calculation: stars + 5 * stars_gained
                trending_score = round(float(item.get("stars", 0) + (item.get("stars_gained", 0) * 5)), 2)

                if existing:
                    existing.stars = item.get("stars", existing.stars)
                    existing.forks = item.get("forks", existing.forks)
                    existing.stars_gained = item.get("stars_gained", existing.stars_gained)
                    existing.trending_score = trending_score
                    existing.last_seen_at = now_utc
                    if summary_data:
                        existing.summary = summary_data.get("summary")
                        existing.why_trending = summary_data.get("why_trending")
                        existing.key_features = summary_data.get("key_features", [])
                        existing.good_for = summary_data.get("good_for")
                        if readme_hash:
                            existing.readme_hash = readme_hash
                else:
                    new_repo = Repo(
                        id=repo_id,
                        full_name=item["full_name"],
                        url=item["url"],
                        description=item.get("description"),
                        primary_language=item.get("primary_language"),
                        topics=item.get("topics", []),
                        license=item.get("license"),
                        stars=item.get("stars", 0),
                        forks=item.get("forks", 0),
                        stars_gained=item.get("stars_gained", 0),
                        trending_score=trending_score,
                        category=category,
                        summary=summary_data.get("summary") if summary_data else item.get("description"),
                        why_trending=summary_data.get("why_trending") if summary_data else f"Trending with {item.get('stars', 0)} stars.",
                        key_features=summary_data.get("key_features", []) if summary_data else (item.get("topics", [])[:4]),
                        good_for=summary_data.get("good_for") if summary_data else f"Engineers using {item.get('primary_language', 'open-source')}.",
                        readme_hash=readme_hash,
                        first_seen_at=now_utc,
                        last_seen_at=now_utc,
                    )
                    db.add(new_repo)

                # Step 4: Record daily snapshot
                snap = (
                    await db.execute(
                        select(RepoSnapshot).where(
                            RepoSnapshot.repo_id == repo_id,
                            RepoSnapshot.snapshot_date == today_date,
                        )
                    )
                ).scalar_one_or_none()

                if snap:
                    snap.stars = item.get("stars", snap.stars)
                    snap.forks = item.get("forks", snap.forks)
                else:
                    db.add(
                        RepoSnapshot(
                            repo_id=repo_id,
                            snapshot_date=today_date,
                            stars=item.get("stars", 0),
                            forks=item.get("forks", 0),
                        )
                    )

                total_saved += 1
            except Exception as e:
                errors.append(f"Error processing repo {item.get('full_name')}: {str(e)}")

        await db.commit()

    return {
        "message": f"Trending sync complete. Processed {total_saved} quality repositories.",
        "repos_fetched": total_fetched,
        "repos_saved": total_saved,
        "ai_summaries_generated": ai_count,
        "errors": errors,
    }
