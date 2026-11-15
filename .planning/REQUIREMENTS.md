# Requirements: DevLens

**Defined:** 2026-11-10  
**Core Value:** Deliver high-signal, zero-noise engineering insights by pairing strict multi-source quality curation and hallucination-grounded AI summarization with transparent, developer-centric learning telemetry.

---

## v1 Requirements (Shipped & Validated)

### 1. Ingestion & Quality Pipeline

- [x] **ING-01**: Background worker running on boot and every 12 hours aggregating from 17 authoritative sources across 6 categories.
- [x] **ING-02**: Ingestion cap enforced at 7-15 articles per category per day to prevent feed flooding.
- [x] **ING-03**: 4-factor scoring algorithm calculating weighted sum ($0.35 \times \text{Freshness} + 0.40 \times \text{Authority} + 0.15 \times \text{Substance} + 0.10 \times \text{Engagement}$).
- [x] **ING-04**: 0.65 threshold gate discarding low-quality or thin content.
- [x] **ING-05**: Exact SHA-256 URL hashing deduplication backed by DB unique index.
- [x] **ING-06**: Gemini Flash summarization enforcing strict `responseSchema` (summary, why_it_matters, key_takeaways, difficulty, skills_extracted) at `temperature: 0.1` with raw RSS excerpt fallback.

### 2. Authentication & Preferences

- [x] **AUTH-01**: User registration with lowercase normalization, email format validation, and direct `bcrypt` salting.
- [x] **AUTH-02**: Login supporting both username and email returning HS256-signed JWT with 7-day expiry.
- [x] **AUTH-03**: Role enforcement (`role: 'admin' | 'user'`) in DB and JWT claims with route-level `require_admin` guard.
- [x] **AUTH-04**: Interactive category onboarding modal on initial account creation saving subscriptions to user profile.

### 3. Feed & Presentation UX

- [x] **FEED-01**: Paginated feed retrieval via `/api/articles` with limit up to 200 items.
- [x] **FEED-02**: SQL-level filtering by user subscribed categories when `category=all`.
- [x] **FEED-03**: Two-phase filter UI with explicit APPLY and RESET controls to prevent unnecessary re-rendering.
- [x] **FEED-04**: Deterministic cover image generation via article ID hashing mapped to curated Unsplash tech assets.
- [x] **FEED-05**: Interactive article modal with AI executive summary, key takeaways, and difficulty badges.
- [x] **FEED-06**: Reading toggle (`/api/articles/{id}/toggle-read`) and bookmark toggle (`/api/articles/{id}/toggle-bookmark`) updating `ReadEvent` records.
- [x] **FEED-07**: Per-user upvoting toggle (`/api/articles/{id}/upvote`) tracking engagement.

### 4. Admin Curation Panel

- [x] **ADM-01**: Dedicated admin dashboard at `/admin` protected by `require_admin`.
- [x] **ADM-02**: Live category statistics endpoint (`/api/admin/stats`) showing daily quota usage and totals.
- [x] **ADM-03**: Candidate preview pipeline (`/api/admin/articles/fetch-candidates`) with `trafilatura` full-text extraction and `textstat` local readability scoring without saving.
- [x] **ADM-04**: Admin approval endpoint (`/api/admin/articles/approve`) persisting vetted candidates.

### 5. Recommendation & Analytics Engine

- [x] **REC-01**: Content-based recommendation endpoint (`/api/articles/{id}/recommendations`) using scikit-learn TF-IDF vectorization and cosine similarity.
- [x] **REC-02**: Hybrid personalization algorithm ("FOR YOU" feed sort) blending relevance, skill affinity, category affinity, source affinity, and exponential freshness decay.
- [x] **REC-03**: Diversity guard in personalizer preventing more than 3 consecutive articles from the same source with $\epsilon$-exploration.
- [x] **ANA-01**: Personal learning telemetry endpoint (`/api/analytics/me`) returning reading totals, velocity, and consecutive streak calculations.
- [x] **ANA-02**: 45-day reading activity heatmap matrix rendered in `AnalyticsBoard.jsx`.
- [x] **ANA-03**: Paginated reading history endpoint (`/api/analytics/me/history`).
- [x] **ANA-04**: Daily reading goal widget (`DailyGoalWidget.jsx`) embedded in the feed and analytics views.

---

## Active & Pending Requirements

### 6. Interactive Knowledge Verification (Quizzes)

- [x] **QUIZ-01**: Backend quiz generation endpoint (`GET /api/quiz/generate?articleId=...`) using Gemini Flash to generate 3-5 grounded multiple-choice questions per article with fallback.
- [x] **QUIZ-02**: Backend quiz evaluation & score persistence endpoint (`POST /api/quiz/submit`) updating `ReadEvent.quiz_score` and `User.quizzes_taken` / `average_quiz_score`.
- [x] **QUIZ-03**: Frontend wiring of `QuizModal.jsx` into `App.jsx` replacing the `ComingSoonView` placeholder, with automated score telemetry submission.

### 7. Automated Testing & Verification

- [x] **TEST-01**: Backend test suite using `pytest` and `httpx.AsyncClient` covering auth endpoints, scoring logic, deduplication, analytics, and quiz flows (`backend/tests/test_api.py`).
- [ ] **TEST-02**: Frontend test suite using `vitest` and `@testing-library/react` verifying feed rendering, filter state toggling, and modal interactions.
- [x] **TEST-03**: Test runner scripts and pre-commit verification gates (verified via pytest automated runner).

### 8. Production Hardening & CI/CD

- [ ] **HARD-01**: Rate limiting on public and sensitive endpoints (`/api/articles/sync`, `/api/auth/login`).
- [x] **HARD-02**: Authentication on `POST /api/articles/sync` (restricted manual pipeline sync to admin users with `require_admin`).
- [ ] **HARD-03**: GitHub Actions CI workflow running backend pytest and frontend build verification on push.

### 9. Architectural Reconciliation & Content Depth

- [x] **ARCH-01**: Formal routing of orphaned components (`ArchitectureVivaView.jsx`, `AgentPipelineView.jsx`) into `App.jsx` and `Header.jsx` under "VIVA DEFENSE".
- [x] **ARCH-02**: Enriched content extraction: multi-tab reader (`OVERVIEW`, `DEEP DIVE`, `CLEAN READER`) with `deep_dive`, `code_snippet`, and `full_content` DB persistence and Gemini prompt upgrade.
- [ ] **ARCH-03**: Documentation synchronization: update `docs/` Markdown guides to match the deployed codebase reality.

---

## Traceability Matrix

| Requirement | Target Phase | Status | Evidence Path |
|-------------|--------------|--------|---------------|
| ING-01..06  | Phase 1: Core Ingestion & AI Pipeline | COMPLETED | `backend/app/services/fetcher.py`, `summariser.py` |
| AUTH-01..04 | Phase 1: Authentication & Preferences | COMPLETED | `backend/app/controllers/auth_controller.py` |
| FEED-01..07 | Phase 1: Feed Delivery & Interaction | COMPLETED | `backend/app/controllers/article_controller.py`, `frontend/src/` |
| ADM-01..04  | Phase 2: Admin Panel & Full-Text Curation | COMPLETED | `backend/app/controllers/admin_controller.py`, `AdminPanel.jsx` |
| REC-01..03  | Phase 3: Personalized Feed & Recommendations | COMPLETED | `backend/app/services/recommender.py`, `personalizer.py` |
| ANA-01..04  | Phase 3: Learning Analytics & Telemetry | COMPLETED | `backend/app/controllers/analytics_controller.py`, `AnalyticsBoard.jsx` |
| QUIZ-01..03 | Phase 4: Interactive Quizzes & Verification | COMPLETED | `backend/app/controllers/quiz_controller.py`, `QuizModal.jsx` |
| TEST-01..03 | Phase 5: Automated Test Harness & QA | COMPLETED (Backend) | `backend/tests/test_api.py` (8 passing integration tests) |
| HARD-01..03 | Phase 6: Production Hardening & CI/CD | IN PROGRESS | `require_admin` guard on `/api/articles/sync` |
| ARCH-01..03 | Phase 7: Architectural Reconciliation | COMPLETED | `App.jsx`, `Header.jsx`, `ArticleModal.jsx`, `summariser.py` |
