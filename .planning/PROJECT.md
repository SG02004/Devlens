# DevLens

## What This Is

DevLens is an AI-powered technical learning platform and engineering intelligence aggregator designed for developers and computer science students. It autonomously aggregates engineering blogs, research preprint servers, and technical articles across 6 major domains, filters them through a custom 4-factor quality scoring algorithm (freshness, authority, substance, engagement), generates structured insights using Google Gemini Flash, and serves a personalized, telemetry-driven developer feed.

## Core Value

Deliver high-signal, zero-noise engineering insights by pairing strict multi-source quality curation and hallucination-grounded AI summarization with transparent, developer-centric learning telemetry.

## Requirements

### Validated

<!-- Shipped and confirmed working in production -->

- ✓ **INGEST-01**: Automated 12-hour background ingestion from 17 curated RSS feeds and Dev.to REST API across 6 engineering categories.
- ✓ **SCORE-01**: Custom 4-factor quality scoring algorithm ($0.35 \times \text{Freshness} + 0.40 \times \text{Authority} + 0.15 \times \text{Substance} + 0.10 \times \text{Engagement}$) with 0.65 threshold filtering.
- ✓ **DEDUP-01**: Exact URL deduplication via normalized SHA-256 hashing backed by unique DB constraints.
- ✓ **SUMM-01**: Hallucination-resistant Gemini 2.5 Flash summaries constrained by strict `responseSchema`, temperature 0.1, and grounding prompts with raw RSS fallback.
- ✓ **AUTH-01**: Real JWT authentication using pure salted bcrypt (no passlib) with email/username login and category onboarding.
- ✓ **FEED-01**: Instant SQL-filtered feed loading (zero live scraping at request time) with client-side category memoization, two-phase filter state, and pagination.
- ✓ **ADMIN-01**: Role-based Admin Curation Panel (`/api/admin/*`) with candidate fetching, on-demand text extraction (trafilatura), textstat readability scoring, and one-click database approval.
- ✓ **RECOM-01**: In-modal content recommendations using local CPU-bound TF-IDF vectorization and cosine similarity over indexed articles.
- ✓ **ANALYT-01**: Developer learning telemetry (`/api/analytics/me`) computing 45-day activity heatmaps, reading velocity, consecutive streaks, and reading history.
- ✓ **PERS-01**: Hybrid personalization engine ("FOR YOU" feed ranking) blending relevance score, skill affinity, category affinity, source affinity, and exponential freshness decay with a diversity guard.

### Active

<!-- Planned or partially implemented capabilities -->

- [ ] **QUIZ-01**: Dynamic AI-generated multiple-choice technical verification quizzes per article with scoring and telemetry persistence.
- [ ] **TEST-01**: Automated backend integration and unit test suite (pytest + pytest-asyncio) covering auth, pipeline, scoring, and analytics endpoints.
- [ ] **TEST-02**: Frontend component and integration test suite (Vitest + React Testing Library) validating feed filtering, modal interactions, and auth flows.
- [ ] **HARD-01**: Production hardening including rate limiting on `/api/articles/sync`, JWT refresh token rotation, and CI/CD verification workflows.
- [ ] **CLEAN-01**: Architectural reconciliation to wire or prune orphaned frontend views (`ArchitectureVivaView.jsx`, `AgentPipelineView.jsx`).

### Out of Scope

<!-- Explicit boundaries to prevent scope creep -->

- TypeScript rewrite — Explicit project constraint: strictly vanilla React JavaScript (JSX).
- Celery / Redis distributed task queues — The application deliberately relies on native `asyncio.create_task` lifespan background workers to remain within single-process free deployment limits.
- Full-text Elasticsearch / Pinecone vector database — Heavy external infrastructure avoided; local scikit-learn TF-IDF and SQL indices satisfy search and similarity needs.
- Social community threads / comment forums — DevLens is a focused learning reader, not a social discussion network.

## Context

- **Academic Context**: MCA Minor Project I at BCIIT, GGSIPU Delhi (Batch 2025–2027), supervised by Mr. Meetender.
- **Runtime Environment**: Python 3.13 (`uvicorn`) backend, Vite 6 + React 19 + Tailwind CSS 4 frontend, PostgreSQL (Supabase pooler) database, hosted on Railway.
- **Previous Drift**: Phase 2 and Phase 3 capabilities were implemented in code (commits `6ec8574`, `bdfc992`, `5cc0b93`) while documentation files (`Phase3_Recommendations_And_Analytics_Plan.md`, `DevLens_Full_Project_Context.md`) remained in proposal/stale status.

## Constraints

- **Tech Stack**: Strict separation of concerns (MVC pattern). No TypeScript allowed anywhere in frontend.
- **Deployment**: Must operate smoothly within free-tier resource boundaries (Railway free credits and Supabase 500 MB database limits).
- **Offline / Fallback Resilience**: Any third-party failure (Gemini API, external RSS feed) must gracefully degrade to local excerpts without crashing the application.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure `bcrypt` instead of `passlib` | `passlib` crashed in Linux container runtimes on bcrypt $\ge 4.1$ | Resolved in commit `2c7e7e1` |
| Local TF-IDF for recommendations | Zero external API costs, zero rate limits, runs on local CPU in milliseconds | Implemented in `recommender.py` |
| Store-and-serve feed architecture | Eliminates live scraping delays during user feed reads | Millisecond SQL query latency |
| Single-process `asyncio` auto-sync | Avoids Celery/Redis dependencies on Railway | Operational via `main.py` lifespan |
| Guarded `ALTER TABLE` at startup | Avoids Alembic overhead for simple relational additions | Implemented in `database.py` |
