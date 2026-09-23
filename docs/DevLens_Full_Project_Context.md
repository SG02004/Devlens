# DevLens — Full Project Context for AI Coding Agent

> Feed this document to your AI coding agent at the start of any build session.
> It contains the complete, up-to-date state, decisions, and architecture of the project.
> **Last updated: September 22, 2026**

---

> [!IMPORTANT]
> **Workspace Scope & Tech Stack Directive:**
> - **Exclusively work in `devlens-demo/` (`c:\Users\Saurabh\Desktop\Web Dev\devlens\devlens-demo`).**
> - Frontend: **Strictly React JavaScript (`.jsx` / `.js`)**. Zero TypeScript allowed.
> - Backend: **Python 3.13 (`py -3.13`) + FastAPI**. Run with `py -3.13 -m uvicorn main:app --reload --port 8000` from `backend/`.

---

## 1. Project Identity

- **Name:** DevLens (devlens-demo)
- **Type:** MCA Minor Project I
- **Student:** Saurabh Goswami
- **Institution:** BCIIT, GGSIPU Delhi | Batch MCA 2025–2027
- **Supervisor:** Mr. Meetender
- **Background:** Knows MERN stack. Learning Python for the first time through this project. No TypeScript.

---

## 2. What DevLens Is

DevLens is an **AI-powered tech news aggregation and learning platform** that:

1. **Automatically collects** technical articles from free, high-signal RSS feeds and the Dev.to API (no paid APIs)
2. **Quality-ranks** each article using a custom scoring algorithm (freshness + source authority + content substance + engagement)
3. **AI-summarises** new articles using Google Gemini Flash — producing a structured summary, "why it matters", key takeaways, difficulty level, and skills extracted
4. **Personalises** the feed based on each user's selected topic preferences
5. **Deduplicates** articles using SHA-256 URL hashing so the same article is never saved twice

**Target user:** Engineering/CS students who want structured, curated tech updates without information overload.

---

## 3. Current State — What Is Fully Built (September 22, 2026)

### Backend (FastAPI + Python 3.13)

**Location:** `devlens-demo/backend/`

| Component | Status | Notes |
|---|---|---|
| JWT Authentication (bcrypt) | ✅ Done | Register, login, me, update preferences |
| PostgreSQL via Supabase | ✅ Connected | asyncpg driver, connection pooler |
| SQLAlchemy ORM Models | ✅ Done | `users`, `articles` tables |
| Article Feed Endpoint | ✅ Done | Pagination, category filter, user preference filter |
| RSS Feed Fetcher | ✅ Done | 17 feeds across 6 categories |
| Dev.to API Fetcher | ✅ Done | Per-category tag mapping |
| Quality Scoring Algorithm | ✅ Done | 4-factor score: freshness, authority, substance, engagement |
| Daily Article Cap | ✅ Done | 15 articles/category/day enforced in DB |
| SHA-256 Deduplication | ✅ Done | No duplicate URLs ever saved |
| Gemini AI Summariser | ✅ Done | gemini-2.5-flash, responseSchema, anti-hallucination triad |
| Input validation (Auth) | ✅ Done | Email format, password length, duplicate check |

### Frontend (React 19 + Vite + Tailwind CSS)

**Location:** `devlens-demo/frontend/`

| Component | Status | Notes |
|---|---|---|
| Auth Page (Sign In / Sign Up) | ✅ Done | Form validation, error messages, JWT storage |
| Category Onboarding Modal | ✅ Done | First login flow |
| Article Feed | ✅ Done | User-topic filter, category pills, search |
| Article Modal | ✅ Done | Full article view with summary, takeaways, skills |
| Header + User Dropdown | ✅ Done | Name formatting, avatar, logout |
| Profile Section | ✅ Done | Edit preferences, view stats |
| Analytics Page | ✅ Done (placeholder) | "Coming soon" state |
| Quiz Page | ✅ Done (placeholder) | "Coming soon" state |
| Loading Animations | ✅ Done | Skeleton screens on article load |

### Database (Supabase / PostgreSQL)

```
Host:     aws-0-ap-northeast-1.pooler.supabase.com
Port:     6543 (shared pooler)
User:     postgres.cvytceiytfpvmodsybqj
DB:       postgres
```
Password and full `DATABASE_URL` are in `backend/.env`.

---

## 4. Folder Structure (Current, Actual)

```
devlens-demo/
├── backend/
│   ├── main.py                     ← FastAPI app entry, CORS, router registration
│   ├── requirements.txt
│   ├── .env                        ← Secrets (DATABASE_URL, JWT_SECRET, GEMINI_API_KEY)
│   └── app/
│       ├── controllers/
│       │   ├── auth_controller.py  ← /api/auth/* routes (register, login, me, preferences)
│       │   ├── article_controller.py ← /api/articles/* routes (feed, sync)
│       │   └── health_controller.py  ← /api/health
│       ├── models/
│       │   ├── database.py         ← SQLAlchemy async engine + get_db dependency
│       │   ├── user.py             ← User ORM model
│       │   ├── article.py          ← Article ORM model
│       │   └── read_event.py       ← ReadEvent ORM model
│       ├── services/
│       │   ├── fetcher.py          ← RSS + Dev.to fetcher, quality scoring, daily cap logic
│       │   └── summariser.py       ← Gemini AI summariser (responseSchema, anti-hallucination)
│       ├── views/
│       │   ├── auth_views.py       ← Pydantic request/response models for auth
│       │   └── article_views.py    ← Pydantic request/response models for articles
│       └── utils/
│           ├── config.py           ← Settings (pydantic BaseSettings, reads .env)
│           └── security.py         ← bcrypt, JWT create/decode, get_current_user
│
├── frontend/
│   ├── vite.config.js              ← Vite config (port 3000, proxy /api → :8000)
│   └── src/
│       ├── App.jsx                 ← Root component, auth state, routing logic
│       ├── main.jsx
│       ├── components/
│       │   ├── Header.jsx          ← Top nav, user dropdown, logout
│       │   ├── ArticleFeed.jsx     ← Main feed, topic pills, search, skeleton loading
│       │   ├── ArticleCard.jsx     ← Individual article card
│       │   ├── ArticleModal.jsx    ← Full article view modal
│       │   ├── AuthPage.jsx        ← Sign In / Sign Up with validation
│       │   ├── CategoryOnboardingModal.jsx ← First-login category picker
│       │   ├── ProfileSection.jsx  ← User profile and preferences
│       │   ├── ComingSoonView.jsx  ← Placeholder for Analytics & Quiz
│       │   └── QuizModal.jsx       ← Quiz UI (wired to future endpoint)
│       ├── data/
│       │   └── mockDatabase.js     ← CATEGORIES_CONFIG (6 categories), INITIAL_USER_PROFILE
│       └── utils/
│           ├── imageUtils.js       ← Category-seeded cover image picker (Unsplash)
│           └── tfidf.js            ← Client-side TF-IDF for keyword extraction
│
└── docs/
    ├── DevLens_Full_Project_Context.md   ← This file (up-to-date)
    ├── DevLens_Review_Guide.md           ← Study guide for review preparation
    ├── Backend_Beginner_Guide.md         ← Detailed Python/FastAPI learning doc
    └── Feed_Sources.md                   ← All RSS feed sources documented
```

---

## 5. All API Endpoints (Current, Working)

| Method | Route | Auth | What it does |
|---|---|---|---|
| GET | `/api/health` | No | Server health check |
| POST | `/api/auth/register` | No | Create user, validate email/password, return JWT |
| POST | `/api/auth/login` | No | Login by email or username, return JWT |
| GET | `/api/auth/me` | Yes | Return current user profile + preferences |
| PUT | `/api/auth/preferences` | Yes | Update user's selected topic categories |
| GET | `/api/articles` | Optional | Paginated feed — filters by user preferences if logged in |
| GET | `/api/articles/{id}` | No | Single article details |
| POST | `/api/articles/sync` | No | Trigger article collection from all sources |

**Interactive API docs:** `http://127.0.0.1:8000/docs` (Swagger UI — auto-generated by FastAPI)

---

## 6. Key Technical Decisions (with rationale)

### 6.1 Why Python + FastAPI (not Express)
- Student learning Python as an explicit goal of this project
- FastAPI auto-generates Swagger docs at `/docs` — zero extra work, great for review demos
- Pydantic = same as Joi/Zod in JS. SQLAlchemy = same as Mongoose. `async/await` = same as JavaScript
- `py -3.13` because asyncpg and pydantic-core have no prebuilt wheels for Python 3.14 on Windows

### 6.2 Why self-sourcing (RSS + Dev.to) instead of NewsAPI
- NewsAPI/GNews free tiers **forbid production use** in their Terms of Service
- Mentor pushed back: "just calling an API is not a custom agent" — self-sourcing answers this objection
- Dev.to, arXiv, CSS-Tricks, Krebs on Security, AWS Blog — all open, free, no ToS restrictions

### 6.3 Why Supabase (PostgreSQL) not SQLite
- Project needs to run in the browser from college when Saurabh can't bring his laptop
- Supabase = free hosted PostgreSQL with a permanent URL — deploys to Render and just works
- Same SQLAlchemy code, only `DATABASE_URL` in `.env` changes

### 6.4 Quality Scoring — Why custom algorithm instead of just taking all articles
- RSS feeds produce 50–200 items — showing all of them would be noise
- 4-factor score: **Freshness (35%) + Source Authority (40%) + Content Substance (15%) + Engagement (10%)**
- Articles below `QUALITY_THRESHOLD = 0.65` are discarded before saving
- Cap: maximum 15 articles per category per day

### 6.5 Deduplication via SHA-256 URL hash
- Same article appears in multiple feeds. Without dedup, the DB fills with duplicates.
- SHA-256 of the normalized URL (lowercased, stripped) is stored as `url_hash` with a `UNIQUE` constraint
- If `url_hash` already exists in the DB → skip. One line check, zero duplicates forever.

### 6.6 Gemini AI Summariser — Anti-Hallucination Triad
Always used together on every Gemini call:
1. `temperature: 0.1` → near-deterministic output, no creative hallucinations
2. `responseSchema` → forces exact JSON structure at the model level (summary, why_it_matters, key_takeaways, difficulty, skills_extracted)
3. **Grounding system prompt** → "Summarize ONLY from the provided text. Do NOT fabricate metrics."

### 6.7 The "Custom AI Agent" framing (for mentor questions)
> "The LLM is one tool the agent calls — like a database call. The custom part is the orchestration: the self-sourcing Fetch step, the quality-ranking algorithm, the SHA-256 deduplication, the Gemini call with grounding, and the DB upsert. That is all original code written by us."

---

## 7. All Content Sources (Current)

| Category | Sources |
|---|---|
| Web Development | CSS-Tricks RSS, web.dev RSS |
| Artificial Intelligence | arXiv cs.AI RSS, Hugging Face Blog, OpenAI Blog |
| Data Science | KDnuggets RSS, arXiv cs.LG RSS |
| Cyber Security | The Hacker News RSS, Bleeping Computer, Krebs on Security |
| Cloud Computing | AWS News Blog RSS, Google Cloud Blog, Azure Blog |
| DevOps | The New Stack RSS, CNCF Blog, Kubernetes Blog |
| All categories | Dev.to API (per-category tag mapping) |

---

## 8. Environment & Secrets

**File:** `backend/.env`

```
DATABASE_URL=postgresql+asyncpg://postgres.cvytceiytfpvmodsybqj:...@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
JWT_SECRET=devlens_jwt_secret_key_2026_super_secure
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
HOST=127.0.0.1
PORT=8000
```

> [!NOTE]
> The Gemini key is valid and tested — it lists 40+ models including `gemini-2.5-flash`.
> It times out locally due to ISP firewall blocking long POST connections.
> It will work fully when deployed (Render/Railway) where no such restrictions exist.

---

## 9. Developer Constraints

- **Machine:** Lenovo IdeaPad S145, AMD A6-9225, 8GB RAM, no GPU
- **Python:** Use `py -3.13` always — 3.14 has no prebuilt wheels for `asyncpg`/`pydantic-core` on Windows
- **No local Docker** — Dockerfile exists for cloud deployment only (Render). Never `docker run` locally.
- **No GPU** — all AI via Gemini REST API, no local inference
- **Can't bring laptop to college** → Must deploy before next review

---

## 10. Instructions for AI Coding Agent

1. **Python:** Always target 3.11–3.13. Run with `py -3.13`. Never use 3.14 features.
2. **Database:** Connected to Supabase (PostgreSQL). Do not assume SQLite. Never hardcode DB URL.
3. **No Docker locally** — it's for cloud deployment only.
4. **All Gemini calls** must use `responseSchema`, `temperature: 0.1`, and a grounding system prompt.
5. **No TypeScript** in frontend — `.jsx` and `.js` only.
6. **Ponytail mode** — simplest working code. No premature abstractions. No speculative features.
7. **Beginner-friendly** — student is new to Python. Comment every non-obvious line. Mentor will ask.
8. **Root-cause fixes** — fix the actual bug, not symptoms.
9. **Next priority: Deployment** — Render (backend) + Vercel/Netlify (frontend).
