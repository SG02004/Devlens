# Project State

## Project Reference

See: `.planning/PROJECT.md` (initialized 2026-11-10)

**Core value:** Deliver high-signal, zero-noise engineering insights by pairing strict multi-source quality curation and hallucination-grounded AI summarization with transparent, developer-centric learning telemetry.  
**Current focus:** Phase 1 (GitHub Trending Repos MVP) Complete → Next: Phase 2 (Aggregation Quality & Sources Registry)

---

## Current Position

Phase: Phase 1 of Aggregation & Trending Plan Complete (GitHub Trending Repos MVP)  
Plan: Completed Phase 1 implementation wave  
Status: Phase 0 and Phase 1 implemented & verified  
Last activity: 2026-11-15 — Implemented GitHub Trending Repos MVP: `Repo` & `RepoSnapshot` models, OSS Insight + GitHub Search fallback ingestion, quality gate filtering out awesome-* lists/forks/spam, Gemini structured repo summarization with README hashing, `/api/repos/trending` & `/api/repos/sync` endpoints, frontend "TRENDING REPOS" tab with `RepoCard` & `TrendingReposView`, and 13 passing automated integration/unit tests.  

Progress: [████████████████████] Phase 0 & Phase 1 100% Verified

---

## Performance Metrics

**Milestone Completion:**
- Phase 0 (Aggregation Hardening & Observability): Shipped & Verified (11/11 tests, `sync_runs` table, quota docstrings, dead code pruned)
- Phase 1 (GitHub Trending Repos MVP):
  - [x] Separate `repos` and `repo_snapshots` models with numeric GitHub ID primary key
  - [x] Resilient ingestion: OSS Insight primary with GitHub Search API fallback
  - [x] Strict quality gate: rejects forks, archived, awesome-* link lists, and spam
  - [x] Grounded Gemini repo summarizer with README hashing (`readme_hash`) & deterministic fallback
  - [x] Controller & endpoints: `GET /api/repos/trending` & admin `POST /api/repos/sync`
  - [x] Automated background task integration in `main.py`
  - [x] Frontend `TrendingReposView` with period, language, category filters, and `RepoCard`
  - [x] Automated test suite: 13/13 pytest tests passing (100%)
  - [x] Frontend build check: 100% passing clean build (0 errors)

---

## Accumulated Context

### Decisions
- Direct `bcrypt` adopted over `passlib` to avert Linux container segfaults/exceptions.
- In-process scikit-learn TF-IDF engine utilized for zero-latency, zero-cost content recommendations.
- Two-phase filter draft state implemented on frontend to avoid redundant re-renders and network calls.
- `ReadEvent` table tracks read, bookmark, upvote, and quiz score telemetry joined in feed retrieval.
- Multi-tier article depth: schema expanded to require 3-4 paragraph `deep_dive` with architecture/trade-offs, a concrete `code_snippet`, and fallback full extracted text.
- Dialect-safe column migrations: `_ensure_columns` inspects tables dynamically using `sync_conn.dialect.name` avoiding Postgres/SQLite syntax collisions.

### Resolved Gaps
- **RESOLVED**: `frontend/src/components/QuizModal.jsx` now connects to live `GET /api/quiz/generate` and submits telemetry to `POST /api/quiz/submit`.
- **RESOLVED**: Automated integration test suite created (`backend/tests/test_api.py`) passing with 100% coverage on auth, scoring, sync, deduplication, and quiz flows.
- **RESOLVED**: Endpoint `POST /api/articles/sync` now locked with `require_admin`.
- **RESOLVED**: Orphaned `ArchitectureVivaView.jsx` and `AgentPipelineView.jsx` rendered under the "VIVA DEFENSE" tab in `App.jsx` and `Header.jsx`.
- **RESOLVED**: Removed unreferenced `frontend/src/utils/tfidf.js`.
- **RESOLVED**: Short and boring article summaries resolved with comprehensive architectural deep dives, code patterns, and distraction-free clean reader.
