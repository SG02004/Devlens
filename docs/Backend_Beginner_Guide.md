# DevLens Backend — Beginner's Guide & Build Plan
**Written for:** Saurabh Goswami (MERN Stack developer, learning Python for the first time)  
**Last Updated:** September 2026  
**Project:** DevLens MCA Minor Project I — BCIIT, GGSIPU Delhi

---

> **Read this first.** This guide is your map. It explains every concept you need to know, every file you need to build, the exact order to build it, and *why* each decision was made. Think of it as a textbook written specifically for your project.

---

## Table of Contents

1. [The Big Picture — What You Are Building](#1-the-big-picture)
2. [How This Backend Is Different from Express](#2-python-vs-express-the-translation-guide)
3. [The 8-Step Pipeline Explained Simply](#3-the-8-step-pipeline-explained-simply)
4. [Where Your Data Comes From — 3-Tier Source Strategy](#4-data-sources-the-3-tier-model)
5. [The Algorithms You Will Write Yourself](#5-the-custom-algorithms-you-will-write)
6. [Your File Structure & What Each File Does](#6-file-structure--what-each-file-does)
7. [Step-by-Step Build Order (Phase 1 → Production)](#7-step-by-step-build-order)
8. [Running & Testing Your Backend](#8-running--testing)
9. [How to Scale This Later](#9-how-to-scale-this-later)
10. [Cheatsheet: Python ↔ JavaScript Equivalents](#10-python--javascript-cheatsheet)

---

## 1. The Big Picture

### What does DevLens actually do?

DevLens is an **AI-powered tech article aggregator**. Instead of you manually browsing Hacker News, Dev.to, arXiv, and dozens of engineering blogs every day, DevLens:

1. **Fetches** articles automatically from those sources (in the background, on a schedule)
2. **Scores** each article using a custom algorithm (not just "newest first")
3. **Selects** only the best 15 per category
4. **Summarises** them using Google Gemini AI
5. **Serves** them instantly to the React frontend from a local database

### The Two Mistakes Most Student Projects Make

**Mistake 1 — Live Scraping on Request:**
```
User clicks "Feed" → Backend scrapes HN + Dev.to + arXiv RIGHT NOW → 10 seconds later, articles appear
```
This is slow, brittle, and will timeout. **DevLens does NOT do this.**

**Mistake 2 — AI Wrapper Syndrome:**
```
User clicks "Feed" → Backend sends headlines to ChatGPT → GPT makes up rankings
```
This is lazy engineering. A black-box LLM ranking articles has no logic you can explain. **DevLens does NOT do this.**

### The DevLens Way

```
[Background Job — runs every hour]
Fetch → Deduplicate → Score → Select Top 15 → Extract Full Text → AI Summarise → Save to DB

[User clicks "Feed" — instant]
DB Query (milliseconds) → JSON Response → React renders it
```

Ingestion and serving are **completely separated.** This is what makes it production-grade.

---

## 2. Python vs Express — The Translation Guide

You know Node.js/Express. Here is Python/FastAPI translated for you:

| Concept | Express (JavaScript) | FastAPI (Python) |
|---|---|---|
| Web framework | `express()` | `FastAPI()` |
| Route handler | `app.get('/path', (req, res) => {...})` | `@app.get('/path')` + `async def handler():` |
| Request body (typed) | `req.body` (no type safety) | Pydantic model (like Zod, but enforced) |
| Response | `res.json({...})` | `return {...}` (auto-serialized) |
| Middleware | `app.use(...)` | `app.add_middleware(...)` |
| Async function | `async function handler() {...}` | `async def handler():` |
| await | `await somePromise()` | `await some_coroutine()` |
| npm install | `pip install` | same idea |
| package.json | `requirements.txt` | same idea |
| .env file | `dotenv` library | `python-dotenv` library |
| Database ORM | Mongoose (MongoDB) | SQLAlchemy (SQL) |
| Schema validation | Joi / Zod | Pydantic |
| JWT | `jsonwebtoken` | `python-jose` |
| Password hash | `bcryptjs` | `passlib[bcrypt]` |
| HTTP client | `axios` / `fetch` | `httpx` |

**The mental model is identical.** Only the syntax changes.

### Key Python Syntax for You

```python
# JavaScript:
const add = (a, b) => a + b

# Python:
def add(a, b):
    return a + b

# JavaScript:
const fetchArticles = async () => {
    const res = await fetch(url)
    const data = await res.json()
    return data
}

# Python:
async def fetch_articles():
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        data = res.json()
        return data

# JavaScript:
const article = {
    title: "Hello",
    url: "https://example.com"
}

# Python (dictionary):
article = {
    "title": "Hello",
    "url": "https://example.com"
}

# JavaScript:
articles.filter(a => a.score > 0.5)

# Python:
[a for a in articles if a.score > 0.5]  # "list comprehension"
```

---

## 3. The 8-Step Pipeline Explained Simply

This is the heart of DevLens. You will build this pipeline step by step.

```
[RSS Feeds + Free APIs]
      │
      ▼
1. Multi-Source Fetcher  — Pulls raw items from Tier 1 (APIs) & Tier 2 (RSS)
      │
      ▼
2. Deduplication Engine  — SHA-256 URL hashing + duplicate rejection in DB
      │
      ▼
3. Relevance Scorer      — Freshness (40%) + Engagement (40%) + Source weight (20%)
      │
      ▼
4. Digest Selection      — Top 15 articles per category daily
      │
      ▼
5. Content Extractor     — Trafilatura scrapes full text only for top candidates
      │
      ▼
6. AI Summariser         — Gemini 1.5 Flash generates structured JSON summary
      │
      ▼
7. Database Storage      — Save lightweight SQL records (~2 KB per article)
      │
      ▼
8. Serving Layer (API)   — Instant SQL queries for /feed and /digest/{period}
```

### Step 1 — Multi-Source Fetcher

**What it does:** Makes HTTP requests to multiple sources and collects raw article data.

**Your sources:**
- Hacker News via Algolia API → `https://hn.algolia.com/api/v1/search?tags=story`
- Dev.to API → `https://dev.to/api/articles?per_page=30&top=3`
- arXiv Atom XML → `https://export.arxiv.org/rss/cs.AI`

**In Python (httpx):**
```python
import httpx

async def fetch_from_devto(tag: str) -> list:
    url = f"https://dev.to/api/articles?tag={tag}&per_page=30&top=3"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        return response.json()  # Returns a list of article dicts
```

**Why httpx and not requests?** Because `requests` is synchronous (blocking). `httpx` supports `async/await` — same as `fetch` in JavaScript.

---

### Step 2 — Deduplication Engine

**The problem:** An article might appear on both HN and Dev.to. You don't want it twice.

**The solution:** Before saving any article, hash its URL with SHA-256 and check if that hash is already in the database.

```python
import hashlib

def hash_url(url: str) -> str:
    # SHA-256 produces a unique 64-character string for any input
    return hashlib.sha256(url.encode()).hexdigest()

# Example:
hash_url("https://dev.to/someone/my-article")
# → "a3f2c9..." (always the same for the same URL)
```

**In the database:** You store a `url_hash` column with a `UNIQUE` constraint. If you try to insert a duplicate, the database rejects it automatically.

---

### Step 3 — Relevance Scorer

**The problem:** "Newest first" is lazy. A 2-hour-old article with 800 upvotes on HN is better than a 1-minute-old article with 0 upvotes.

**The formula:**
```
relevance_score = (freshness × 0.4) + (engagement × 0.4) + (source_weight × 0.2)
```

**In Python:**
```python
from datetime import datetime, timezone

def calculate_relevance_score(
    published_at: datetime,
    upvotes: int,
    source_name: str
) -> float:

    # --- Freshness (0.0 to 1.0) ---
    # An article published now gets 1.0. After 48 hours it gets 0.0.
    hours_old = (datetime.now(timezone.utc) - published_at).total_seconds() / 3600
    freshness = max(0.0, 1.0 - (hours_old / 48))

    # --- Engagement (0.0 to 1.0) ---
    # We cap upvotes at 200 so one viral article doesn't dominate everything
    engagement = min(upvotes / 200, 1.0)

    # --- Source Weight (0.6 to 0.9) ---
    # Research sources get more trust
    source_weights = {
        "arxiv":    0.9,
        "deepmind": 0.9,
        "openai":   0.85,
        "mit":      0.85,
        "devto":    0.7,
        "hn":       0.75,
    }
    source_weight = source_weights.get(source_name, 0.6)

    # --- Final Score ---
    score = (freshness * 0.4) + (engagement * 0.4) + (source_weight * 0.2)
    return round(score, 4)
```

This is **your custom algorithm.** When your mentor asks "how do you rank articles?", you explain this formula. That is what separates DevLens from an "AI wrapper."

---

### Step 4 — Digest Selection

**What it does:** After scoring, take only the top 15 per category. This keeps the DB lean and AI costs low.

```python
def select_top_articles(scored_articles: list, top_n: int = 15) -> list:
    # Sort by score (highest first), take the first 15
    return sorted(scored_articles, key=lambda a: a["relevance_score"], reverse=True)[:top_n]
```

---

### Step 5 — Content Extractor (Trafilatura)

**The problem:** Most RSS feeds give you only a short teaser (2–3 sentences), not the full article. Gemini needs the full text to write a good summary.

**The solution:** For the top 15 articles, use `trafilatura` to scrape the full article text from its URL.

```python
import trafilatura

def extract_full_text(url: str) -> str | None:
    # trafilatura downloads the page and extracts just the article text
    # (removes ads, nav bars, footers — just the clean content)
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        return None
    text = trafilatura.extract(downloaded)
    return text
```

**Install:** `pip install trafilatura`

**Why only top 15?** Scraping every article would be slow and could get you rate-limited/blocked. You do it selectively, only when you need good text for AI summarization.

---

### Step 6 — AI Summariser (Google Gemini)

**What it does:** Takes the full article text and asks Gemini to produce a structured JSON summary.

**Important rules (non-negotiable for this project):**
1. `temperature: 0.1` — Near-deterministic. No hallucinations.
2. `responseSchema` — Forces Gemini to return exact JSON, not free-form text.
3. Grounding system prompt — "Summarise ONLY from the provided text."

```python
import httpx, json, os

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "tldr":           {"type": "STRING"},
        "why_it_matters": {"type": "STRING"},
        "key_takeaways":  {"type": "ARRAY", "items": {"type": "STRING"}},
        "difficulty":     {"type": "STRING"},  # "Beginner" | "Intermediate" | "Advanced"
    },
    "required": ["tldr", "why_it_matters", "key_takeaways", "difficulty"]
}

async def summarise_article(title: str, full_text: str) -> dict | None:
    prompt = f"""You are a technical editor. Summarise the article below.
Return ONLY a JSON summary based on the actual text. Do NOT invent facts.

TITLE: {title}

ARTICLE TEXT:
{full_text[:6000]}  # Limit to ~6000 chars to stay within token limits
"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            GEMINI_URL,
            params={"key": GEMINI_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                    "responseSchema": SUMMARY_SCHEMA,
                }
            }
        )
        data = response.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
```

**Cost calculation:** 75 calls/day (5 categories × 15 articles) × 30 days = **2,250 calls/month.** Gemini 1.5 Flash free tier allows **1,500 free RPD** (requests per day). Well within limits.

---

### Step 7 — Database Storage

**Why SQL (SQLite) and not MongoDB?**  
You know MongoDB. SQL is actually simpler for this use case because:
- You need indexed sorting by `relevance_score` and `fetched_at`
- SQLite is a single file — zero setup, zero server
- The same code works with PostgreSQL (for production) by changing one line in `.env`

**Your Article table (in plain English):**

| Column | Type | What it stores |
|---|---|---|
| `id` | UUID | Unique identifier |
| `title` | String | Article headline |
| `url` | String | Original article URL (UNIQUE) |
| `url_hash` | String | SHA-256 of URL (for fast dedup) |
| `source` | String | "hn", "devto", "arxiv", etc. |
| `category` | String | "ai-ml", "web-dev", etc. |
| `published_at` | DateTime | When the article was posted |
| `fetched_at` | DateTime | When DevLens fetched it |
| `upvotes` | Integer | Community score |
| `relevance_score` | Float | Your calculated score (0.0–1.0) |
| `summary_tldr` | Text | AI-generated TL;DR |
| `why_it_matters` | Text | AI-generated "Why It Matters" |
| `key_takeaways` | JSON | AI-generated bullet points |
| `full_text` | Text | Scraped article body (optional) |
| `difficulty` | String | "Beginner" / "Intermediate" / "Advanced" |

---

### Step 8 — Serving Layer (Your API)

**The key insight:** By the time a user hits `/articles/feed`, all the work is already done. You just query the database.

```python
# GET /articles/feed — Returns personalized feed for logged-in user
# Query:
# SELECT * FROM articles
# WHERE category IN ('ai-ml', 'web-dev')          ← user's chosen topics
# AND fetched_at > NOW() - INTERVAL '48 hours'    ← recent only
# ORDER BY relevance_score DESC                    ← best first
# LIMIT 20                                        ← paginated
```

This query runs in **under 5 milliseconds** because `relevance_score` and `category` are indexed.

---

## 4. Data Sources — The 3-Tier Model

### Tier 1 — Free APIs (Metadata + Engagement)

| Source | URL Pattern | What You Get | Upvote Signal |
|---|---|---|---|
| Hacker News (Algolia) | `hn.algolia.com/api/v1/search` | Top tech stories | `points` field |
| Dev.to | `dev.to/api/articles?tag=...` | Developer articles | `positive_reactions_count` |
| daily.dev | `api.daily.dev/...` | Curated feeds | `numUpvotes` |

### Tier 2 — Curated RSS Feeds

| Category | Source | RSS URL |
|---|---|---|
| AI & ML | arXiv CS.AI | `https://export.arxiv.org/rss/cs.AI` |
| AI & ML | Hugging Face | `https://huggingface.co/blog/feed.xml` |
| AI & ML | MIT News AI | `https://news.mit.edu/rss/topic/artificial-intelligence2` |
| Cybersecurity | Krebs on Security | `https://krebsonsecurity.com/feed/` |
| Cybersecurity | CISA Advisories | `https://www.cisa.gov/news.xml` |
| Web Dev | web.dev | `https://web.dev/feed.xml` |
| Web Dev | CSS-Tricks | `https://css-tricks.com/feed/` |
| DevOps | Cloudflare Blog | `https://blog.cloudflare.com/rss/` |
| DevOps | Kubernetes | `https://kubernetes.io/feed.xml` |

**To parse RSS in Python:**
```python
import xml.etree.ElementTree as ET
import httpx

async def parse_rss(feed_url: str) -> list:
    async with httpx.AsyncClient() as client:
        response = await client.get(feed_url)
    
    root = ET.fromstring(response.text)
    items = []
    
    for item in root.findall(".//item"):
        items.append({
            "title": item.findtext("title", ""),
            "url":   item.findtext("link", ""),
            "published_at": item.findtext("pubDate", ""),
        })
    
    return items
```

### Tier 3 — On-Demand Extraction (Trafilatura)

Used only when a feed provides a short teaser. Trafilatura visits the URL and extracts clean article text automatically, stripping navigation, ads, and footers.

---

## 5. The Custom Algorithms You Will Write

These are the three algorithms that make DevLens a real engineering project:

### Algorithm 1 — Relevance Scoring (your "proprietary" ranker)

Already explained in Step 3. This is what you show the mentor when asked "what's custom about this?"

### Algorithm 2 — SHA-256 URL Deduplication

Already explained in Step 2. Cross-posting is common in tech. This prevents duplicates across sources.

### Algorithm 3 — Digest Windowing

```python
from datetime import datetime, timedelta, timezone

def get_digest_window(period: str) -> datetime:
    """
    Returns the datetime cutoff for a digest period.
    - "daily"   → articles from last 24 hours
    - "weekly"  → articles from last 7 days
    - "monthly" → articles from last 30 days
    """
    now = datetime.now(timezone.utc)
    windows = {
        "daily":   now - timedelta(hours=24),
        "weekly":  now - timedelta(days=7),
        "monthly": now - timedelta(days=30),
    }
    return windows.get(period, windows["daily"])
```

---

## 6. File Structure & What Each File Does

```
backend/
│
├── main.py                        ← FastAPI app, CORS, router registration, startup
│
├── run.py                         ← Simple script: "py -3.13 run.py" starts the server
│
├── requirements.txt               ← All Python dependencies
│
├── .env                           ← Your secrets (DATABASE_URL, GEMINI_API_KEY, JWT_SECRET)
├── .env.example                   ← Template showing what keys are needed (commit this)
│
└── app/
    │
    ├── models/                    ── DATABASE LAYER (M in MVC)
    │   ├── database.py            ← Creates DB engine, session, get_db() dependency
    │   ├── article.py             ← Article table definition (SQLAlchemy ORM)
    │   ├── user.py                ← User table (id, username, password_hash, categories)
    │   ├── category.py            ← Category table (ai-ml, web-dev, etc.)
    │   └── read_event.py          ← Tracks which user read which article
    │
    ├── views/                     ── SCHEMA LAYER (V in MVC — what the API shows)
    │   ├── article_views.py       ← ArticleResponse, FeedResponse (Pydantic models)
    │   ├── auth_views.py          ← RegisterRequest, LoginResponse, UserProfile
    │   └── ai_views.py            ← QuizRequest, SummaryResponse
    │
    ├── controllers/               ── ROUTE LAYER (C in MVC — the API endpoints)
    │   ├── article_controller.py  ← GET /articles/feed, GET /articles/digest/{period}
    │   ├── auth_controller.py     ← POST /auth/register, POST /auth/login, GET /auth/me
    │   ├── ai_controller.py       ← POST /ai/quiz, POST /ai/summary
    │   └── health_controller.py   ← GET /health
    │
    ├── services/                  ── BUSINESS LOGIC (the actual intelligence)
    │   ├── fetcher.py             ← Multi-source fetcher (HN, Dev.to, RSS)
    │   ├── deduplicator.py        ← SHA-256 URL hashing and DB check
    │   ├── scorer.py              ← Relevance scoring formula
    │   ├── extractor.py           ← Trafilatura full-text scraping
    │   ├── summariser.py          ← Gemini API integration (structured JSON)
    │   └── ingestion_pipeline.py  ← Orchestrates Steps 1–7 in sequence
    │
    └── utils/
        ├── security.py            ← bcrypt password hashing, JWT create/decode
        └── config.py              ← Loads .env variables into Python (pydantic-settings)
```

**Why this structure?**
- Every file has one job (Single Responsibility Principle)
- If Gemini breaks, only `summariser.py` needs fixing
- If you want to add Reddit as a source, you only touch `fetcher.py`
- When your mentor asks "where is the scoring logic?", you say "`services/scorer.py`, line 12"

---

## 7. Step-by-Step Build Order

> Build in this exact order. Each step works and is testable before you move to the next.

### Phase 1 — Foundation (Week 1)

**Goal:** A working API that can register users, log them in, and return articles from the DB.

```
Step 1.1  — Set up backend/ folder + virtual environment
Step 1.2  — Write requirements.txt and install dependencies
Step 1.3  — Write app/models/database.py (SQLite engine + session)
Step 1.4  — Write app/models/user.py and article.py (ORM models)
Step 1.5  — Write app/utils/config.py (.env loader)
Step 1.6  — Write app/utils/security.py (bcrypt + JWT)
Step 1.7  — Write app/views/auth_views.py (Pydantic schemas)
Step 1.8  — Write app/controllers/auth_controller.py (register, login, me)
Step 1.9  — Write main.py (mount router, CORS, startup DB creation)
Step 1.10 — Test: Register a user, log in, get JWT, hit /auth/me
```

**Test command:**
```bash
py -3.13 -m uvicorn backend.main:app --reload --port 8000
# Open: http://127.0.0.1:8000/docs
```

---

### Phase 2 — The Ingestion Pipeline (Week 2)

**Goal:** Fetch real articles from HN + Dev.to + arXiv, score them, and save to DB.

```
Step 2.1  — Write app/services/fetcher.py (HN Algolia + Dev.to + RSS parser)
Step 2.2  — Write app/services/deduplicator.py (SHA-256 URL check)
Step 2.3  — Write app/services/scorer.py (relevance formula)
Step 2.4  — Write app/services/ingestion_pipeline.py (orchestrates 2.1–2.3)
Step 2.5  — Write app/controllers/article_controller.py (manual sync endpoint)
Step 2.6  — Test: POST /articles/sync → articles appear in SQLite DB
Step 2.7  — Test: GET /articles/feed → returns scored articles for logged-in user
```

At the end of Phase 2, the full read flow works end-to-end:
`Frontend → Login → GET /articles/feed → Articles from real sources`

---

### Phase 3 — AI Enrichment (Week 3)

**Goal:** Add Trafilatura extraction and Gemini summarization for top-ranked articles.

```
Step 3.1  — pip install trafilatura
Step 3.2  — Write app/services/extractor.py
Step 3.3  — Write app/services/summariser.py (Gemini structured JSON)
Step 3.4  — Integrate into ingestion_pipeline.py after scorer
Step 3.5  — Test: Run pipeline, check that top 15 articles have summaries in DB
Step 3.6  — Write app/controllers/ai_controller.py (quiz, summary endpoints)
```

---

### Phase 4 — Scheduled Automation (Week 4)

**Goal:** The pipeline runs itself every hour without you doing anything.

```
Step 4.1  — pip install apscheduler
Step 4.2  — In main.py startup lifespan, schedule ingestion_pipeline every 60 min
Step 4.3  — Test: Wait 1 hour, check DB has new articles
Step 4.4  — Add digest endpoints: GET /articles/digest/daily|weekly|monthly
```

---

### Phase 5 — Polish & Deploy (Week 5+)

```
Step 5.1  — Write pytest tests for scorer.py and deduplicator.py (5 minimum)
Step 5.2  — Switch DATABASE_URL to Supabase/Neon PostgreSQL in .env
Step 5.3  — Deploy backend to Render.com (free tier)
Step 5.4  — Deploy frontend to Vercel (free tier)
Step 5.5  — Write README.md with setup instructions
```

---

## 8. Running & Testing

### Start the Server
```bash
# From devlens-demo/ root:
py -3.13 -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Interactive API Docs (Auto-generated by FastAPI)
Open your browser: **http://127.0.0.1:8000/docs**

FastAPI generates a full Swagger UI — you can test every endpoint directly in the browser. This is your biggest advantage over Express. No Postman needed.

### Test the Pipeline Manually
```bash
# Hit the sync endpoint to trigger ingestion right now:
curl -X POST http://127.0.0.1:8000/articles/sync

# Hit the feed endpoint (need JWT token first):
curl -H "Authorization: Bearer YOUR_TOKEN" http://127.0.0.1:8000/articles/feed
```

### Check Your SQLite Database
```bash
# Open the database file directly:
py -3.13 -c "
import sqlite3
conn = sqlite3.connect('devlens.db')
cursor = conn.cursor()
cursor.execute('SELECT title, relevance_score, source FROM articles ORDER BY relevance_score DESC LIMIT 5')
for row in cursor.fetchall():
    print(row)
conn.close()
"
```

---

## 9. How to Scale This Later

The beauty of this design is that **you don't need to rewrite anything to scale.** You just swap out components.

| Right Now (Phase 1–2) | When You Need to Scale |
|---|---|
| SQLite (a file) | PostgreSQL on Supabase/Neon — change `DATABASE_URL`, code unchanged |
| No caching | Add Redis on Upstash — wrap `/articles/feed` response in cache |
| Manual sync via endpoint | APScheduler every 60 min — add 5 lines to `main.py` |
| 3 sources (HN, Dev.to, arXiv) | Add more in `fetcher.py` — one new function per source |
| No full-text | Trafilatura for top articles — one new service file |
| Single server | Deploy to Render with Docker — Dockerfile already written |

**The key architectural decision that makes this scalable:** Ingestion and serving are completely separate. You can add 10 more sources, or speed up the pipeline, without touching the serving layer at all.

---

## 10. Python ↔ JavaScript Cheatsheet

```python
# ----- VARIABLES -----
# JS:  const name = "Saurabh"
name = "Saurabh"            # Python: no const/let/var

# ----- LISTS (like JS arrays) -----
# JS:  const nums = [1, 2, 3]
nums = [1, 2, 3]
nums.append(4)              # JS: nums.push(4)
nums[0]                     # JS: nums[0]  — same!

# ----- DICTIONARIES (like JS objects) -----
# JS:  const user = { name: "Saurabh", age: 21 }
user = {"name": "Saurabh", "age": 21}
user["name"]                # JS: user.name or user["name"]

# ----- IF / ELSE -----
# JS:  if (score > 0.5) { ... } else { ... }
if score > 0.5:             # Note: colon, no braces, use indentation
    print("Good article")
else:
    print("Skip it")

# ----- FOR LOOPS -----
# JS:  articles.forEach(a => console.log(a.title))
for article in articles:
    print(article["title"])

# JS:  articles.map(a => a.title)
titles = [a["title"] for a in articles]   # list comprehension

# JS:  articles.filter(a => a.score > 0.5)
good = [a for a in articles if a["score"] > 0.5]

# ----- FUNCTIONS -----
# JS:  const greet = (name) => `Hello, ${name}`
def greet(name: str) -> str:
    return f"Hello, {name}"    # f-strings = template literals

# ----- ASYNC / AWAIT -----
# JS:  const data = async () => await fetch(url).then(r => r.json())
async def fetch_data(url: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# ----- CLASSES -----
# JS:  class Article { constructor(title) { this.title = title } }
class Article:
    def __init__(self, title: str):
        self.title = title

# ----- TYPE HINTS (like TypeScript, optional but good practice) -----
def score(freshness: float, engagement: float) -> float:
    return freshness * 0.4 + engagement * 0.4
```

---

## Dependencies — Install All at Once

Create `backend/requirements.txt` with this content:

```
# Web Framework
fastapi>=0.115.0
uvicorn>=0.32.0

# Database
sqlalchemy>=2.0.35
aiosqlite>=0.20.0          # SQLite async driver
# asyncpg>=0.30.0          # Uncomment when switching to PostgreSQL

# Validation & Config
pydantic>=2.9.2
pydantic-settings>=2.4.0
python-dotenv>=1.0.1

# Authentication
python-jose>=3.3.0         # JWT
passlib>=1.7.4             # Password hashing
bcrypt>=4.0.1

# HTTP Client
httpx>=0.28.0              # Async HTTP (like axios, but for Python)

# AI & NLP
trafilatura>=1.12.0        # Full-text article extraction (Phase 3)

# Scheduler (Phase 4)
apscheduler>=3.10.0

# Forms
python-multipart>=0.0.9
```

**Install command:**
```bash
py -3.13 -m pip install -r backend/requirements.txt
```

---

## Your .env File

Create `backend/.env` (never commit this to git):

```bash
# Database — SQLite for now, swap to PostgreSQL on Supabase when ready
DATABASE_URL=sqlite+aiosqlite:///./devlens.db

# Authentication — generate a long random string
JWT_SECRET=devlens_jwt_secret_2026_change_this_in_production

# Google Gemini (Phase 3)
GEMINI_API_KEY=your_key_here

# Server settings
PORT=8000
HOST=127.0.0.1
```

---

## Summary — What You Are Building

| What | Technology | Why |
|---|---|---|
| API Framework | FastAPI (Python 3.13) | Like Express but with auto-docs, type safety, async |
| Database (local) | SQLite via SQLAlchemy | Zero setup, same code runs on PostgreSQL later |
| Authentication | JWT + bcrypt | Same concept as in Node projects |
| HTTP Client | httpx | Like axios but async-native |
| RSS Parsing | xml.etree (built-in) | No extra library needed |
| Full-text Extraction | trafilatura | One-line clean article extraction |
| AI Summaries | Google Gemini 1.5 Flash | Structured JSON output, anti-hallucination controls |
| Scheduler | APScheduler | Runs the pipeline every hour in the background |
| Validation | Pydantic | Like Zod/Joi for Python, integrated with FastAPI |

**The entire backend will be ~600–800 lines of Python across 15 files.** Small, readable, and explainable line-by-line to your mentor.

---

*Read this document, then open `backend/app/models/database.py` and start writing.  
You already know more than you think you do — the concepts are identical to MERN. Only the syntax is different.*
