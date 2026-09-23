# DevLens — Full Project Context for AI Coding Agent

> Feed this document to your AI coding agent at the start of any build session.
> It contains the complete, up-to-date state, decisions, and architecture of the project.
> **Last updated: September 23, 2026**

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

DevLens is an **AI-powered technical learning platform & news intelligence aggregator** that:

1. **Automatically collects** technical articles from 17 free, authoritative RSS feeds and the Dev.to REST API across 6 engineering categories.
2. **Quality-ranks** every candidate article using a 4-factor scoring algorithm (Freshness, Source Authority, Content Substance, Engagement). Articles scoring below `0.65` are dropped.
3. **Caps ingestion** at 15 quality articles per category per day to prevent noise and feed overload.
4. **AI-summarises** new articles using Google Gemini Flash (`gemini-2.5-flash`), extracting executive summaries, "why it matters", key takeaways, difficulty rating, and technical skills.
5. **Personalises** the feed based on each user's selected topic preferences (dual-layer filtering: backend SQL filtering + instant client-side memo).
6. **Deduplicates** via SHA-256 URL hashing so no article is ever saved twice.

---

## 3. Current State & Deliverables (As of September 23, 2026)

### Live Production Deployment (Railway)
- **Frontend Live URL:** [https://devlens-frontend-production.up.railway.app](https://devlens-frontend-production.up.railway.app)
- **Backend Live URL:** [https://devlens-backend-production.up.railway.app](https://devlens-backend-production.up.railway.app)
- **Interactive API Docs (Swagger):** [https://devlens-backend-production.up.railway.app/docs](https://devlens-backend-production.up.railway.app/docs)
- **Live Health Endpoint:** [https://devlens-backend-production.up.railway.app/api/health](https://devlens-backend-production.up.railway.app/api/health)

### Backend (FastAPI + Python 3.13)
- **Location:** `devlens-demo/backend/`
- **Real JWT Auth (Pure Bcrypt):** Native `bcrypt.hashpw` / `bcrypt.checkpw` replaces unmaintained `passlib`. Registration, login (email or username), profile read/update (`GET`/`PUT /api/auth/profile`), and topic preferences (`/api/auth/preferences`).
- **PostgreSQL Database:** Connected to Supabase via `asyncpg` connection pooler.
- **Article Pipeline:** Collects from 17 feeds; 117+ articles currently indexed and scored (scores 0.84 – 0.95).
- **Automated Background Sync (Approach A):** Runs via FastAPI `lifespan` 5 seconds after server boot and repeats every 12 hours automatically.
- **Dynamic CORS & Error Shield:** Supports `CORS_ORIGINS` with quote stripping + `allow_origin_regex=r"https://.*\.up\.railway\.app"`. Global 500 error handler always includes CORS headers to prevent browser masking.
- **API Limits:** Endpoint `/api/articles` supports query `limit` up to 200 items.

### Frontend (React 19 + Vite + Tailwind CSS)
- **Location:** `devlens-demo/frontend/`
- **Production Routing:** Global `window.fetch` interceptor (`main.jsx`) automatically routes all relative `/api/*` calls to the live Railway backend in production while keeping Vite's local dev proxy on localhost. Defensively normalizes URLs and auto-prepends `https://`.
- **Cross-Platform Native Engine:** `@tailwindcss/oxide-linux-x64-gnu` pinned in primary `dependencies` with `frontend/nixpacks.toml` and `.npmrc` (`include=optional`) for seamless Linux builds.
- **Initial Feed Load:** App fetches up to 150 articles on boot, ensuring rich category pools.
- **Filter Controls:**
  - Explicit **"APPLY"** button (`btn-apply-filters`) and **"RESET"** button (`btn-reset-filters`).
  - Draft filter state separates user input selections from the active feed until "APPLY" is clicked.
  - "LAST 3 MONTHS" option removed; default time horizon is "ALL TIME" (value 0).
  - Quick topic pills at the top jump and apply categories immediately on click.
- **Pagination & Loading UX:**
  - Initial view displays strictly **15 articles** (1 featured hero + 14 grid cards).
  - **"LOAD MORE ARTICLES"** button appears when more articles exist.
  - Clicking "LOAD MORE" displays an animated spinner and pulsing skeleton placeholder cards for ~450ms, then reveals the next 15 articles.
- **Sign Up / Sign In:**
  - Full Name placeholder: `"your name"`
  - Email placeholder: `"your gmail"` (Sign Up) / `"name@gmail.com or username"` (Sign In)
- **Cover Image Generation:** Deterministic bitwise hashing of `article.id` mapped to curated Unsplash editorial tech photography (`imageUtils.js`). Fast, CDN-cached, 0 external API limits, 0 broken links.

---

## 4. Live Storage & Database Metrics (Supabase)

Queried live from Supabase PostgreSQL:
- **`articles` table (117+ articles):** **~264 KB** (includes summaries, takeaways, skills JSON, indexes).
- **`users` table:** **128 KB**.
- **All App Tables Combined:** **~1.8 MB**.
- **Supabase Free Quota:** **500 MB**.
- **Storage Consumption:** **~0.36% of free tier** (>498 MB free). At 15 articles/category/day (~90 articles/day = ~200 KB/day), the database can run for **6+ years** before reaching 500 MB.

---

## 5. Folder Structure (Current, Actual)

```
devlens-demo/
├── .gitignore                      ← Clean: ignores .env, node_modules, __pycache__, .venv
├── README.md
├── backend/
│   ├── main.py                     ← App entry, lifespan, auto-sync worker, Railway CORS regex, global error handler
│   ├── requirements.txt
│   ├── railway.json                ← Railway deployment config (Nixpacks, uvicorn $PORT)
│   ├── .env                        ← Secrets (DATABASE_URL, JWT_SECRET, GEMINI_API_KEY)
│   ├── .env.example
│   └── app/
│       ├── controllers/
│       │   ├── auth_controller.py  ← /api/auth/* (register, login, profile read/update, preferences)
│       │   ├── article_controller.py ← /api/articles/* (feed, sync, execute_article_sync)
│       │   └── health_controller.py  ← /api/health
│       ├── models/
│       │   ├── database.py         ← SQLAlchemy async engine + AsyncSessionLocal
│       │   ├── user.py             ← User model
│       │   ├── article.py          ← Article model (with url_hash, relevance_score)
│       │   └── read_event.py       ← ReadEvent model
│       ├── services/
│       │   ├── fetcher.py          ← RSS + Dev.to fetcher, quality scoring (0.65 threshold)
│       │   └── summariser.py       ← Gemini Flash summariser (responseSchema, temperature: 0.1)
│       ├── views/
│       │   ├── auth_views.py       ← Pydantic schemas for auth
│       │   └── article_views.py    ← Pydantic schemas for articles (ArticleResponse, FeedResponse)
│       └── utils/
│           ├── config.py           ← Settings from .env
│           └── security.py         ← Native bcrypt password hashing, JWT creation/verification
│
├── frontend/
│   ├── package.json                ← With serve, direct oxide-linux-x64-gnu dependency
│   ├── nixpacks.toml               ← Forces npm install --force on Railway
│   ├── .npmrc                      ← include=optional for cross-platform binaries
│   ├── vite.config.js              ← Port 3000, proxies /api -> http://127.0.0.1:8000
│   ├── railway.json                ← Railway deployment config (build & serve dist)
│   ├── .env.example                ← VITE_API_URL documentation
│   └── src/
│       ├── App.jsx                 ← App state, loads 150 articles, auth checks
│       ├── main.jsx                ← App entry with production /api routing interceptor
│       ├── index.css
│       ├── components/
│       │   ├── Header.jsx          ← Nav, cleanName formatting, user dropdown
│       │   ├── ArticleFeed.jsx     ← Feed, 15-item pagination, Load More, Apply filters
│       │   ├── ArticleCard.jsx     ← Article card with difficulty, score, skills
│       │   ├── ArticleModal.jsx    ← Article detail, summary, takeaways, redirect link
│       │   ├── AuthPage.jsx        ← Sign in / Sign up with validated placeholders
│       │   ├── CategoryOnboardingModal.jsx ← Onboarding topic picker
│       │   ├── ProfileSection.jsx  ← User settings & category updates
│       │   ├── ComingSoonView.jsx  ← Placeholder for Analytics & Quiz
│       │   └── DailyGoalWidget.jsx ← Daily reading target tracker
│       ├── controllers/
│       │   ├── apiClient.js        ← Centralized fetch wrapper, handles VITE_API_URL
│       │   └── authController.js   ← Auth helper methods
│       └── utils/
│           ├── imageUtils.js       ← Deterministic cover image hasher
│           └── tfidf.js            ← Client-side TF-IDF keyword extractor
│
└── docs/
    ├── DevLens_Full_Project_Context.md ← This file
    └── DevLens_Review_Guide.md         ← Full review study guide & mentor Q&A
```

---

## 6. Content Sources (17 Curated Feeds)

| Category | Sources |
|---|---|
| **Artificial Intelligence** | arXiv cs.AI, OpenAI Blog, Hugging Face Blog, Dev.to AI |
| **DevOps** | Kubernetes Official Blog, CNCF Blog, The New Stack, Dev.to DevOps |
| **Cyber Security** | Krebs on Security, The Hacker News, Bleeping Computer, Dev.to Security |
| **Cloud Computing** | AWS News Blog, Google Cloud Blog, Azure Blog, Dev.to Cloud |
| **Data Science** | arXiv cs.LG, KDnuggets, Dev.to Data Science |
| **Web Development** | web.dev (Google Chrome), CSS-Tricks, Dev.to Webdev |

---

## 7. Key Architecture & Decisions for Review

1. **Why FastAPI over Express:** Automatic interactive OpenAPI documentation at `/docs` (Swagger UI). Mentors can test every API endpoint live without writing code.
2. **Quality Scoring Algorithm:** 
   $$\text{Score} = (\text{Freshness} \times 0.35) + (\text{Authority} \times 0.40) + (\text{Substance} \times 0.15) + (\text{Engagement} \times 0.10)$$
   Articles below `0.65` are dropped. Maximum 15 articles per category per day.
3. **URL Deduplication:** SHA-256 hash of normalized URL with a unique database index. Ensures $O(1)$ duplicate prevention.
4. **Anti-Hallucination Triad for Gemini:**
   - `temperature: 0.1` (near-deterministic)
   - `responseSchema` (forces exact JSON shape)
   - Grounding system prompt (*"Summarize ONLY based on provided text"*).
5. **Deterministic Image Generation:** Curated Unsplash editorial collection mapped by domain and hashed by article ID. Fast CDN loading, 0 external API limits, 0 broken links.
6. **Pure Bcrypt over Passlib:** Legacy `passlib 1.7.4` has a known breaking incompatibility with `bcrypt >= 4.1.0` in Linux container runtimes. Refactored to use standard `bcrypt.hashpw` and `bcrypt.checkpw` directly, ensuring zero-dependency compatibility and reliable authentication.
7. **Transparent Dynamic CORS & Error Shield:** FastAPI's default 500 handler bypasses CORSMiddleware, which causes browsers to falsely report a "CORS error" whenever an unhandled exception occurs. Fixed by adding a global exception handler that always sets CORS headers, plus `allow_origin_regex=r"https://.*\.up\.railway\.app"` in FastAPI.
8. **Universal Frontend API Normalizer:** Added an interceptor in `frontend/src/main.jsx` that dynamically routes `/api/*` to the deployed backend on Railway while retaining Vite proxy in local development, automatically sanitizing and prepending `https://` if omitted.

---

## 8. Live Production Deployment on Railway

Both services are deployed in a single Railway project from GitHub repo [`SG02004/Devlens`](https://github.com/SG02004/Devlens):

### Live Endpoints
| Service | Production Domain | Purpose |
|---|---|---|
| **Frontend** | `https://devlens-frontend-production.up.railway.app` | React 19 + Tailwind CSS Web Application |
| **Backend** | `https://devlens-backend-production.up.railway.app` | FastAPI + Python 3.13 API Engine |
| **API Docs** | `https://devlens-backend-production.up.railway.app/docs` | Interactive Swagger UI |
| **Health Check** | `https://devlens-backend-production.up.railway.app/api/health` | Live Service & Database Health |

### Exact Railway Environment Configuration

#### Backend Service (`devlens-backend`)
- **Root Directory:** `backend`
- **Variables:**
  ```env
  DATABASE_URL=postgresql://postgres.cvytceiytfpvmodsybqj:v%3F%246%29M%2FD6g%40uF%3Fs@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
  JWT_SECRET=devlens_jwt_secret_key_2026_super_secure
  GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
  PORT=8000
  CORS_ORIGINS=https://devlens-frontend-production.up.railway.app
  ```

#### Frontend Service (`devlens-frontend`)
- **Root Directory:** `frontend`
- **Variables:**
  ```env
  VITE_API_URL=https://devlens-backend-production.up.railway.app
  PORT=3000
  ```

### Key Deployment Troubleshooting Lessons Learned

1. **Native Rust TailWind v4 Bindings (`@tailwindcss/oxide`):**
   - *Problem:* Developing on Windows locked only `oxide-win32-x64-msvc`. When Railway built on Linux under `NODE_ENV=production`, `npm ci` skipped optional dependencies, throwing `Error: Cannot find native binding`.
   - *Solution:* Pinned `@tailwindcss/oxide-linux-x64-gnu` directly in `package.json` `"dependencies"`, configured `frontend/.npmrc` with `include=optional`, and added `frontend/nixpacks.toml` with `cmds = ["npm install --force"]`.
2. **Missing `https://` in `VITE_API_URL`:**
   - *Problem:* Setting `VITE_API_URL="devlens-backend-production.up.railway.app"` without `https://` caused browsers to treat the backend domain as a relative subfolder on the frontend domain (`https://frontend/backend/api/...`), returning 404.
   - *Solution:* Implemented `normalizeApiUrl` in `main.jsx` and `apiClient.js` that automatically prepends `https://` and strips trailing slashes defensively.
3. **Misleading CORS Error on 500 Responses:**
   - *Problem:* Chrome logged `Blocked by CORS policy: No 'Access-Control-Allow-Origin' header` when calling `/api/auth/signup`. The actual error was a 500 crash inside `passlib`.
   - *Solution:* Replaced `passlib` with direct `bcrypt` calls, and added a global FastAPI exception handler in `backend/main.py` that guarantees CORS headers on all 500 responses.

---

## 9. Recent Git Commits

- `2c7e7e1` — fix(backend): switch to pure bcrypt and attach CORS headers to global 500 error handler
- `6be338e` — fix(frontend): auto-prefix https:// on API_BASE URL to prevent relative path routing
- `eec42bd` — fix(frontend): add oxide-linux-x64-gnu to dependencies and force npm install in nixpacks
- `c3747cd` — fix: route relative api calls to production backend and enable railway CORS regex
- `966a4a4` — fix(frontend): add Linux oxide optionalDependencies for cross-platform Railway build
- `1be038b` — chore(frontend): add serve dependency and start script for Railway deployment
- `ebac9cf` — docs: update full project context with latest filter, auto-sync, and storage metrics
- `5158ab9` — feat(ui): add Apply filter button, 15-article pagination with animated Load More, remove 3-month option, fix web-dev pool
- `1cb17a1` — fix(ui): update signup placeholders to 'your name' and 'your gmail'
- `48eb7ea` — feat: add automatic background article sync on startup and 12-hour schedule
- `4ad14a8` — fix: remove New Article button, add Railway configs, fix CORS for deployment

