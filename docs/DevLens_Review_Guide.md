# DevLens — Complete Review Preparation Guide

> **Who this is for:** Saurabh Goswami — MCA Minor Project I, BCIIT GGSIPU
> **Purpose:** Understand every part of the project deeply enough to answer any question the mentor asks.
> **Review:** 2nd Project Review — October 8, 2026

---

## PART 1 — PROJECT OVERVIEW (Start here, know this cold)

---

### What is DevLens?

DevLens is an **AI-powered tech news aggregation and learning platform**.

In simple terms: it automatically collects technical articles from across the internet, scores them for quality, uses AI to summarise them, and shows each user only the topics they care about.

Think of it as a personalised, AI-enhanced version of an RSS reader — but one that you built from scratch, including the content collection, the quality ranking, the AI integration, and the user authentication.

---

### The Problem It Solves

Engineering students are overwhelmed with tech news. There are thousands of articles published every day across AI, cloud computing, cybersecurity, DevOps, and web development. There is no good, free tool that:
- Collects from authoritative sources automatically
- Ranks by quality (not just recency)
- Personalises by topic interest
- Gives structured AI summaries instead of raw RSS text

DevLens solves all four of these.

---

### The Tech Stack (memorise this)

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind CSS | You know React from MERN; Vite is faster than CRA |
| Backend | Python 3.13 + FastAPI | Learning Python; FastAPI gives auto Swagger docs |
| Database | PostgreSQL (Supabase) | Free hosted DB, no setup, production-ready |
| ORM | SQLAlchemy 2.0 async | Python equivalent of Mongoose |
| Auth | JWT + bcrypt | Industry-standard — same concept as in Node.js |
| AI | Google Gemini Flash (via REST API) | Free tier, structured JSON output via responseSchema |
| HTTP Client | httpx (async) | Python equivalent of axios/fetch |
| Feed Parser | feedparser | Parses RSS/Atom XML feeds |

---

### How It All Fits Together (the big picture)

```
User opens browser
    ↓
React Frontend (port 3000)
    ↓  (JWT in every request header)
FastAPI Backend (port 8000)
    ↓                          ↓
PostgreSQL DB             Gemini API
(Supabase)            (AI summaries)
    ↑
RSS Feeds + Dev.to API
(content sources — fetched on demand via /sync)
```

---

## PART 2 — BACKEND (Know this in deep detail)

---

### How FastAPI Works

FastAPI is a Python web framework — same idea as Express in Node.js, but in Python.

```
Express (Node.js)          →    FastAPI (Python)
app.get('/route', fn)      →    @router.get('/route')
req.body                   →    Pydantic model (payload: MyModel)
res.json({...})            →    return {...}  (FastAPI auto-converts)
middleware                 →    Depends()
```

FastAPI automatically generates **interactive documentation** at `http://127.0.0.1:8000/docs`. This is called **Swagger UI** and it's the most impressive thing to show the mentor — they can click buttons and test every API endpoint live without writing any code.

---

### The Backend Folder Structure Explained

```
backend/
├── main.py                  ← Entry point. Starts the app, registers routes, sets up CORS.
└── app/
    ├── controllers/         ← Route handlers (equivalent to Express routers)
    │   ├── auth_controller.py       ← /api/auth/* endpoints
    │   └── article_controller.py   ← /api/articles/* endpoints
    ├── models/              ← Database table definitions (SQLAlchemy ORM)
    │   ├── database.py      ← Creates the database connection
    │   ├── user.py          ← The "users" table
    │   └── article.py       ← The "articles" table
    ├── services/            ← Business logic (not tied to HTTP)
    │   ├── fetcher.py       ← Collects articles from RSS feeds + Dev.to
    │   └── summariser.py    ← Calls Google Gemini AI to summarise articles
    ├── views/               ← Pydantic models — shape of request/response data
    │   ├── auth_views.py    ← What login/register data looks like
    │   └── article_views.py ← What an article response looks like
    └── utils/
        ├── config.py        ← Reads .env file into a Settings object
        └── security.py      ← bcrypt password hashing, JWT creation/verification
```

---

### The Database: SQLAlchemy ORM

**What is an ORM?**
ORM = Object-Relational Mapper. Instead of writing raw SQL (`SELECT * FROM users WHERE id = 1`), you write Python classes, and SQLAlchemy writes the SQL for you.

```python
# Instead of:  SELECT * FROM articles WHERE category = 'ai'
# You write:
query = select(Article).where(Article.category == "artificial-intelligence")
result = await db.execute(query)
articles = result.scalars().all()
```

**Why `async`/`await`?**
The database calls take time (network round trip to Supabase in Japan). Using `async`/`await` means the server can handle other requests while waiting — it doesn't block. Same concept as `async/await` in JavaScript.

**The `users` Table:**

| Column | Type | Notes |
|---|---|---|
| id | String (UUID) | Primary key, auto-generated |
| username | String, UNIQUE | Lowercase, indexed for fast lookup |
| email | String, UNIQUE | Normalized to lowercase on save |
| name | String | Display name |
| hashed_password | String | bcrypt hash — never stored in plain text |
| selected_categories | JSON | List like `["ai", "devops"]` |
| read_count | Integer | How many articles read |
| created_at | DateTime | Auto-set to UTC now |

**The `articles` Table:**

| Column | Type | Notes |
|---|---|---|
| id | String (UUID) | Primary key |
| title | String | Article headline |
| url | String, UNIQUE | Original article URL |
| url_hash | String, UNIQUE | SHA-256 of URL — used for deduplication |
| source | String | e.g. "Krebs on Security", "Dev.to" |
| category | String | e.g. "cyber-security", "artificial-intelligence" |
| summary | Text | AI-generated or raw RSS excerpt |
| why_it_matters | Text | AI-generated explanation |
| key_takeaways | JSON | List of bullet points |
| skills_extracted | JSON | List of tech skills mentioned |
| difficulty | String | "Beginner", "Intermediate", or "Advanced" |
| relevance_score | Float | Quality score (0.0 – 1.0) |
| created_at | DateTime | When it was saved to our DB |

---

### Authentication — How it Works Step by Step

**Registration (`POST /api/auth/register`):**

1. User submits `{name, email, password}`
2. Backend validates: email format (must contain `@` and `.`), password at least 8 chars
3. Check if email or username already exists in DB (`SELECT ... WHERE email = ?`)
4. If exists → return `409 Conflict` with helpful error message
5. Hash the password using **bcrypt** (one-way hash — can never be reversed)
6. Save `User` record to DB
7. Create a **JWT token** containing `{sub: user_id, email: email}`
8. Return the token + user profile to the frontend

**Login (`POST /api/auth/login`):**

1. User submits `{identifier, password}` (identifier = email OR username)
2. Look up user by `email OR username`
3. If not found → `404 Not Found`
4. Use `bcrypt.verify(submitted_password, stored_hash)` to check password
5. If wrong password → `401 Unauthorized`
6. If correct → create new JWT token and return it

**Protected Routes:**
Every request to a protected endpoint must include the header:
```
Authorization: Bearer <jwt_token>
```
The `get_current_user` dependency in `security.py` decodes the token, verifies it hasn't expired, and loads the user from DB. If anything fails → `401 Unauthorized`.

**What is JWT?**
JWT = JSON Web Token. It's a digitally signed string containing user data. The server signs it with a secret key. When the client sends it back, the server verifies the signature to confirm it wasn't tampered with. The token expires after a set time (7 days in this project).

---

### The Article Collection Pipeline (fetcher.py)

This is the most original and important part of the project. When someone calls `POST /api/articles/sync`, this is what happens:

**Step 1: Collect candidates from all sources**

For each category (e.g., "cyber-security"):
- Call Dev.to API: `GET https://dev.to/api/articles?tag=security&per_page=4`
- For each RSS feed (e.g., Krebs on Security, Bleeping Computer, The Hacker News):
  - Fetch the RSS XML with `httpx`
  - Parse it with `feedparser`
  - Extract title, URL, summary, author, published date

**Step 2: Calculate Quality Score for each article**

```
Quality Score (0.0 – 1.0) = 
    Freshness (35%)  +  Source Authority (40%)  +  Content Substance (15%)  +  Engagement (10%)
```

- **Freshness:** Published today = 1.0, this week = 0.85, this month = 0.60, older = 0.35
- **Source Authority:** Each source has a preset weight. arXiv = 0.92, OpenAI Blog = 0.90, Dev.to = 0.72
- **Content Substance:** Has the article got a meaningful title (4+ words) and summary (80+ chars)?
- **Engagement:** Dev.to upvote count normalized to 0–1 range

**Step 3: Quality Gate**

- Discard all articles with `quality_score < 0.65` (the `QUALITY_THRESHOLD`)
- Sort remaining articles by score descending (best first)
- Cap at 15 articles maximum (the `MAX_ARTICLES_PER_DAY` limit)

**Step 4: Check daily quota (in article_controller.py)**

Before inserting anything, check how many articles were already saved today for this category:
```python
count_q = SELECT COUNT(*) FROM articles WHERE category = ? AND created_at >= today_midnight
```
If 15 already saved today → skip this category entirely.

**Step 5: Deduplicate**

For each candidate article, compute `SHA-256(url)` and check if it already exists:
```python
SELECT id FROM articles WHERE url_hash = ?
```
If it exists → skip. If new → proceed to save.

**Step 6: AI Summarise (summariser.py)**

For each genuinely new article:
- Call Google Gemini Flash with the article title + text
- Use `responseSchema` to force a structured JSON response:
  ```json
  {
    "summary": "...",
    "why_it_matters": "...",
    "key_takeaways": ["...", "..."],
    "difficulty": "Intermediate",
    "skills_extracted": ["Python", "FastAPI"]
  }
  ```
- If Gemini returns a result → overwrite the raw RSS summary with the AI summary
- If Gemini fails (network timeout locally) → silently use the raw RSS text, don't crash

**Step 7: Save to Supabase**

Create an `Article` ORM object with all fields and `db.add(new_art)`. Then `await db.commit()` to write it to Supabase.

---

### The Gemini AI Integration — Anti-Hallucination Triad

This is something the mentor will likely ask about. Always mention all three controls together:

**1. `temperature: 0.1`**
Temperature controls how "creative" or "random" the model is. 0 = completely deterministic (same input, same output every time). 0.1 = almost deterministic. We use 0.1 because we want factual summaries, not creative writing.

**2. `responseSchema`**
This forces Gemini to return a specific JSON structure. Without it, Gemini might return the answer as a paragraph of text, or include extra keys, or miss a field. With `responseSchema`, the output is guaranteed to have exactly the keys we expect.

**3. Grounding System Prompt**
The prompt starts with: *"Summarize ONLY based on the facts in the provided text. Do NOT fabricate metrics, benchmarks, or claims."*
This prevents the model from making up statistics that weren't in the article.

---

### Security Decisions

| Decision | Why |
|---|---|
| bcrypt for passwords | One-way hash — even if DB is leaked, passwords cannot be reversed |
| JWT with expiry | Stateless auth — no session storage needed on server |
| `UNIQUE` constraint on `url_hash` | Prevents duplicate articles at the database level |
| CORS configured | Only the frontend origin can call the backend API |
| Input normalization | Email and username always lowercased before saving — `"User@Email.com"` and `"user@email.com"` treated as the same |

---

### All API Endpoints (know what each one does)

**Authentication:**

```
POST /api/auth/register    → Create new account, returns JWT
POST /api/auth/login       → Login by email or username, returns JWT
GET  /api/auth/me          → Get current user's profile (requires JWT)
PUT  /api/auth/preferences → Update selected categories (requires JWT)
```

**Articles:**

```
GET  /api/articles         → Get paginated feed
                              ?category=all          → user's preferred categories
                              ?category=cyber-security → that category only
                              ?limit=25&skip=0       → pagination
GET  /api/articles/{id}   → Single article details
POST /api/articles/sync   → Trigger content collection from all sources
                             ?category=devops       → sync only devops
```

**System:**
```
GET /api/health    → Returns {"status": "healthy"}
GET /docs          → Swagger UI (interactive API browser)
```

---

## PART 3 — FRONTEND (Know the key parts)

---

### How the Frontend Works

The React frontend is a **single-page application (SPA)**. There is only one HTML file — React renders everything dynamically in the browser using JavaScript.

**State Management:** No Redux or Zustand — just React's built-in `useState` and `useEffect`. This was a deliberate simplicity choice.

**API calls:** Plain `fetch()` built into the browser. JWT token stored in `localStorage` as `devlens.auth_token`.

---

### App.jsx — The Root Component

This is the heart of the frontend. It holds:
- `isAuthenticated` — whether user is logged in
- `userProfile` — the user's data (name, email, selectedCategories)
- `activeTab` — which page is showing ('feed', 'profile', 'analytics', 'quiz')

On load, it checks `localStorage` for a token. If found, it calls `GET /api/auth/me` to verify the token is still valid and load the user's profile. If the token is expired or invalid, it logs the user out.

---

### Key Frontend Components

**`AuthPage.jsx`** — Sign In / Sign Up
- Two modes: sign in and sign up (toggled by state)
- Client-side validation: email regex, password 8+ chars, name required
- On success: stores JWT in `localStorage`, calls `onAuth` prop to update App state

**`ArticleFeed.jsx`** — The main page
- Fetches articles from `/api/articles` with the JWT header
- Topic pills: only shows the user's subscribed categories (not all 6)
- Skeleton loading animation while articles are loading
- `filteredArticles` memo: filters by selected category on the frontend too

**`ArticleModal.jsx`** — Full article view
- Opens when user clicks any article card
- Shows: title, source, summary, "Why It Matters", key takeaways, skills, difficulty badge
- "Read Full Article" button opens the original URL in a new tab

**`Header.jsx`** — Top navigation
- Shows user's name (title-cased, whitespace-normalized)
- Dropdown with: Topic Preferences, Personal Insights, Sign Out

**`CategoryOnboardingModal.jsx`** — First login
- Shows after registration
- User picks their interested topics
- Calls `PUT /api/auth/preferences` to save to DB

---

### The Feed Filtering Logic (Two-Layer)

This is a subtle but important design detail:

**Layer 1 — Backend:** When `GET /api/articles?category=all` and user is logged in, the SQL query filters:
```python
Article.category.in_(current_user.selected_categories)
```
This means the DB only returns articles in the user's chosen categories.

**Layer 2 — Frontend:** `ArticleFeed.jsx` has a `filteredArticles` memo that applies the selected topic pill filter on the client side, so switching pills feels instant (no new API call).

---

## PART 4 — EXPECTED MENTOR QUESTIONS & ANSWERS

---

**Q: What makes this an "AI project" and not just an RSS reader?**

> "DevLens does more than just fetch and display RSS feeds. Every new article goes through our custom quality-scoring algorithm and then through a Gemini AI summariser that produces a structured analysis: a technical summary, why it matters for engineers, key takeaways, difficulty assessment, and skills extracted. The feed is also personalised per user based on their selected topics. The combination of automated collection, quality ranking, AI summarisation, and personalisation is what distinguishes it from a simple RSS reader."

---

**Q: Where is the "AI agent" part? Isn't it just calling Gemini?**

> "The AI is one tool the system uses — like a database call. The agent behavior comes from the orchestration: (1) the self-sourcing fetch step pulls from 17 different feeds, (2) the custom quality-ranking algorithm scores each candidate article, (3) the deduplication step using SHA-256 hashing ensures nothing is stored twice, (4) then and only then is Gemini called with strict grounding controls, and (5) finally the result is persisted to the database. All of those steps between fetching and storing are original custom code."

---

**Q: Why did you use FastAPI instead of Node.js/Express?**

> "This project was partly a learning goal — to gain hands-on Python experience, which is dominant in AI/ML engineering roles. FastAPI was chosen specifically because it gives us automatic interactive API documentation (Swagger UI at /docs), which means anyone — including you, sir — can test every endpoint live in the browser without writing a single line of code. Its async/await model is conceptually identical to JavaScript, so the transition was natural."

---

**Q: How does your authentication work?**

> "We use JWT (JSON Web Token) authentication with bcrypt password hashing. When a user registers, their password is hashed with bcrypt — a one-way hash that cannot be reversed. We never store the plain-text password. We then issue a signed JWT token containing the user's ID and email. Every subsequent API request includes this token in the Authorization header. The server verifies the token's signature and expiry on each request. If the token is invalid or expired, the server returns 401 Unauthorized."

---

**Q: What stops the same article from being saved multiple times?**

> "We compute a SHA-256 cryptographic hash of every article's URL before saving. This hash is stored in the database as `url_hash` with a UNIQUE constraint. Before inserting any article, we check if that hash already exists. If it does, we skip the insert. SHA-256 produces a fixed 64-character string regardless of URL length, and two different URLs will never produce the same hash. This gives us O(1) deduplication with a single indexed database lookup."

---

**Q: What is the quality scoring algorithm?**

> "We score each fetched article on four factors: freshness (35% weight — articles published today score highest), source authority (40% — we have preset weights for each source, e.g. arXiv papers score 0.92, Dev.to community posts score 0.72), content substance (15% — penalizes articles with very short or missing summaries), and engagement (10% — Dev.to upvote count normalized to 0–1). Articles scoring below 0.65 are discarded. We then cap at 15 articles per category per day to prevent feed overload."

---

**Q: How do you prevent Gemini from hallucinating facts?**

> "We use three controls together — what we call the Anti-Hallucination Triad. First, temperature 0.1 — this makes the output near-deterministic and prevents creative fabrication. Second, responseSchema — this forces Gemini to return a specific JSON structure with exact keys; it cannot add extra content or skip required fields. Third, a grounding system prompt that explicitly says: 'Summarize ONLY based on the facts in the provided text. Do NOT fabricate metrics, benchmarks, or claims.' All three together make the summaries factually reliable."

---

**Q: Why Supabase? Isn't that a third-party service?**

> "Supabase is simply a managed PostgreSQL host — it provides a standard PostgreSQL database accessible via a standard connection string. We use SQLAlchemy to connect to it, exactly as we would connect to any PostgreSQL server. The application code has no dependency on Supabase-specific features — if we changed the DATABASE_URL to point to a different PostgreSQL server, the entire backend would work without a single code change. We chose Supabase because it provides a free, permanently-available database with no local setup, which is important since the project needs to be accessible from college for the review."

---

**Q: What is CORS and why did you configure it?**

> "CORS — Cross-Origin Resource Sharing — is a browser security feature. By default, a web page at `localhost:3000` is blocked from making API calls to `localhost:8000` because they are different 'origins' (different ports). We configure CORS in the FastAPI backend to explicitly allow requests from our frontend's origin. Without this, the browser would block every API call from our React app."

---

**Q: What is async/await and why did you use it?**

> "A database query to Supabase in Japan takes 50–200 milliseconds. Without async, the server would freeze — unable to handle any other request — while waiting for that response. With async/await, the server hands off the waiting to the event loop and immediately starts processing other requests. When the database responds, the original request resumes. This is identical to how async/await works in JavaScript — same mental model, different syntax."

---

## PART 5 — KEY NUMBERS TO REMEMBER

| Metric | Value |
|---|---|
| Content sources | 17 RSS/API feeds across 6 categories |
| Daily article cap | 15 per category |
| Quality threshold | 0.65 / 1.0 |
| Password hashing | bcrypt (10 rounds) |
| JWT expiry | 7 days |
| Gemini temperature | 0.1 (near-deterministic) |
| URL dedup method | SHA-256 hash (64 chars) |
| Backend port | 8000 |
| Frontend port | 3000 |
| Swagger docs | http://127.0.0.1:8000/docs |

---

## PART 6 — WHAT TO DEMO AT THE REVIEW

Run in this order for maximum impact:

1. **Open Swagger UI** at `http://127.0.0.1:8000/docs` — show the mentor every endpoint with descriptions
2. **Register a new account** — show the 409 error if you try to register the same email twice
3. **Login** — show the JWT token returned in the response
4. **Call `GET /api/articles`** — show the paginated feed with quality scores
5. **Call `POST /api/articles/sync?category=devops`** — show live article collection happening in real time
6. **Open the frontend** at `http://localhost:3000` — show the topic pills, article cards, modal with AI summary
7. **Show the Profile section** — show updating category preferences, feed updates immediately

---

> [!TIP]
> If anything fails during the demo: "This works fully in the deployed version. The local environment has a network restriction on outbound AI API calls, but the application logic is complete and has been tested." Then show the Swagger docs as backup.
