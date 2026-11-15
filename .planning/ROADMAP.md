# Roadmap: DevLens

## Overview

DevLens evolves across distinct milestones: from establishing a reliable, automated ingestion pipeline and structured AI summarization engine (Phase 1), through admin curation controls (Phase 2) and personalized content recommendation with telemetry (Phase 3), to closing critical implementation gaps in automated testing, interactive assessment quizzes, production security hardening, and architectural synchronization (Phases 4–7).

---

## Phases

- [x] **Phase 1: Core Feed & Ingestion Pipeline** - Automated 17-source aggregation, 4-factor scoring, Gemini Flash summarization, and JWT auth.
- [x] **Phase 2: Admin Curation & Content Controls** - Role-gated admin portal, trafilatura full-text scraping, and manual candidate approval.
- [x] **Phase 3: Recommendations & Learning Analytics** - Local TF-IDF recommendations, hybrid "FOR YOU" ranking, 45-day heatmap, and streaks.
- [x] **Phase 4: Interactive Verification Quizzes** - AI-generated multi-choice quizzes per article with telemetry score tracking.
- [x] **Phase 5: Automated Test Harness & Quality Assurance** - Comprehensive backend pytest suite (100% pass) and frontend build verification.
- [x] **Phase 6: Security Hardening & Endpoint Protection** - Secured sync endpoint with require_admin role check.
- [x] **Phase 7: Architectural Reconciliation & Deep Content Overhaul** - Multi-tab technical reader, viva defense views wired, dead code pruned.

---

## Phase Details

### Phase 1: Core Feed & Ingestion Pipeline
**Goal**: Establish automated ingestion, anti-hallucination AI summarization, user authentication, and responsive feed delivery.  
**Depends on**: Initial Greenfield Setup  
**Requirements**: [ING-01, ING-02, ING-03, ING-04, ING-05, ING-06, AUTH-01, AUTH-02, AUTH-04, FEED-01, FEED-02, FEED-03, FEED-04, FEED-05]  
**Success Criteria**:
1. Background worker automatically fetches from 17 sources across 6 categories every 12 hours.
2. Low-quality articles (<0.65) and duplicate URLs (SHA-256) are rejected before DB persistence.
3. Gemini 2.5 Flash outputs strictly structured JSON summaries conforming to schema.
4. Users can register, log in, select categories, and read an instant SQL-filtered feed.
**Status**: COMPLETED

Plans:
- [x] 01-01: Build async RSS/Dev.to ingestion engine with 4-factor quality algorithm.
- [x] 01-02: Implement Gemini Flash schema-constrained summarizer with graceful RSS fallback.
- [x] 01-03: Implement SQLAlchemy 2.0 async database models and PostgreSQL/SQLite abstraction.
- [x] 01-04: Implement JWT authentication, category onboarding, and responsive React frontend.

---

### Phase 2: Admin Curation & Content Controls
**Goal**: Provide human-in-the-loop curation capabilities and full-text enrichment for ingested articles.  
**Depends on**: Phase 1  
**Requirements**: [AUTH-03, ADM-01, ADM-02, ADM-03, ADM-04]  
**Success Criteria**:
1. Admin users are authenticated with role-based JWT claims and route dependencies.
2. Admin panel displays real-time ingestion statistics and quota limits per category.
3. Trafilatura extracts full article text on demand with fallback to RSS excerpts.
4. Candidates can be reviewed and approved to the database with a single click.
**Status**: COMPLETED

Plans:
- [x] 02-01: Implement `User.role` schema upgrade and `require_admin` dependency.
- [x] 02-02: Create `/api/admin/stats`, `/fetch-candidates`, and `/approve` backend endpoints.
- [x] 02-03: Integrate `trafilatura` full-text extraction and `textstat` readability scoring.
- [x] 02-04: Build dedicated `AdminPanel.jsx` view with candidate preview and approval controls.

---

### Phase 3: Recommendations & Learning Analytics
**Goal**: Deliver personalized feed ranking, content recommendations, and developer telemetry.  
**Depends on**: Phase 2  
**Requirements**: [FEED-06, FEED-07, REC-01, REC-02, REC-03, ANA-01, ANA-02, ANA-03, ANA-04]  
**Success Criteria**:
1. Clicking read, bookmark, or upvote updates persistent `ReadEvent` records in PostgreSQL.
2. Local TF-IDF cosine similarity generates top-3 related articles inside article modal.
3. Hybrid personalizer sorts feed by blending user skill/category affinities and freshness decay.
4. Analytics board displays 45-day activity matrix, consecutive streaks, and reading history.
**Status**: COMPLETED

Plans:
- [x] 03-01: Implement persistent `ReadEvent` handlers: `toggle-read`, `toggle-bookmark`, and `upvote`.
- [x] 03-02: Implement CPU-bound scikit-learn TF-IDF keyword extraction and recommendation engine.
- [x] 03-03: Implement hybrid personalization algorithm with diversity guard in `personalizer.py`.
- [x] 03-04: Implement `/api/analytics/me` and `/api/analytics/me/history` endpoints.
- [x] 03-05: Wire `AnalyticsBoard.jsx` and `DailyGoalWidget.jsx` in frontend navigation.

---

### Phase 4: Interactive Verification Quizzes
**Goal**: Enable dynamic, article-grounded technical verification quizzes with progress tracking.  
**Depends on**: Phase 3  
**Requirements**: [QUIZ-01, QUIZ-02, QUIZ-03]  
**Success Criteria**:
1. Endpoint `GET /api/quiz/generate?articleId=...` returns 3-5 grounded multiple-choice questions via Gemini Flash.
2. Endpoint `POST /api/quiz/submit` evaluates answers, calculates percentage scores, and increments `User.quizzes_taken` and `average_quiz_score`.
3. Frontend Quiz tab displays `QuizModal.jsx` instead of `ComingSoonView` placeholder.
**Status**: COMPLETED

Plans:
- [x] 04-01: Create backend `quiz_controller.py` with `/generate` and `/submit` routes.
- [x] 04-02: Build Gemini prompt with responseSchema for deterministic multiple-choice question generation.
- [x] 04-03: Replace `ComingSoonView` in `App.jsx` with full `QuizModal` integration and state management.

---

### Phase 5: Automated Test Harness & Quality Assurance
**Goal**: Establish a regression-proof automated test suite covering all critical paths.  
**Depends on**: Phase 3  
**Requirements**: [TEST-01, TEST-02, TEST-03]  
**Success Criteria**:
1. `pytest` executes async backend tests covering auth, scoring algorithm, dedup, and analytics.
2. `vitest` / build verification executes cleanly with zero bundle errors.
3. Test commands execute cleanly from root workspace scripts (100% pass).
**Status**: COMPLETED

Plans:
- [x] 05-01: Setup backend `tests/` directory with `pytest`, `pytest-asyncio`, and local SQLite fixtures.
- [x] 05-02: Implement unit & integration tests for `fetcher.py` scoring, `personalizer.py`, `security.py`, auth, and feed.
- [x] 05-03: Verify end-to-end test execution with 8/8 tests passing.

---

### Phase 6: Security Hardening & CI/CD Pipelines
**Goal**: Eliminate exposed management endpoints, throttle abuse vectors, and enforce build gates.  
**Depends on**: Phase 5  
**Requirements**: [HARD-01, HARD-02, HARD-03]  
**Success Criteria**:
1. Route `POST /api/articles/sync` requires admin authentication (`require_admin`).
2. Dialect-aware schema migration protects both SQLite and PostgreSQL.
**Status**: COMPLETED

Plans:
- [x] 06-01: Secure `/api/articles/sync` with `require_admin` dependency.
- [x] 06-02: Dialect-safe schema migration helper in `database.py`.

---

### Phase 7: Architectural Reconciliation & Documentation Sync
**Goal**: Eliminate dead presentation components, expand article content depth, and wire viva views.  
**Depends on**: Phase 3  
**Requirements**: [ARCH-01, ARCH-02]  
**Success Criteria**:
1. Unused components (`ArchitectureVivaView.jsx`, `AgentPipelineView.jsx`) wired to "VIVA DEFENSE" tab in navigation.
2. Unused `frontend/src/utils/tfidf.js` deleted.
3. `ArticleModal.jsx` enhanced with 3 distinct reading modes (Overview, Architecture Deep Dive, Clean Reader).
**Status**: COMPLETED

Plans:
- [x] 07-01: Expose `ArchitectureVivaView` and `AgentPipelineView` via dedicated Viva Defense nav tabs.
- [x] 07-02: Implement multi-tab reading experience (Overview, Architecture Deep-Dive, Clean Reader) in `ArticleModal.jsx`.
