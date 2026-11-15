import os
import sys
import uuid
import asyncio
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.models.database import Base, get_db, _ensure_columns
from app.models.article import Article
from app.models.user import User
from app.models.sync_run import SyncRun
from app.models.repo import Repo
from app.utils.security import hash_password, create_access_token
from app.services.fetcher import calculate_quality_score, select_quality_articles, hash_url
from app.services.recommender import calculate_recommendations, extract_top_keywords
from app.services.github_trending import is_awesome_list, is_quality_repo, infer_repo_category

TEST_DB_FILE = "./test_devlens.db"
test_engine = create_async_engine(f"sqlite+aiosqlite:///{TEST_DB_FILE}", echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


async def _bootstrap_test_db():
    """Initializes local SQLite schema and seeds fixtures for integration tests."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_columns)

    async with TestSessionLocal() as session:
        test_art = Article(
            id="test-art-1",
            title="Distributed Consensus with Raft",
            url="https://example.com/raft-consensus",
            url_hash=hash_url("https://example.com/raft-consensus"),
            source="Google Research Blog",
            source_url="https://example.com/raft-consensus",
            author="Google Systems Team",
            published_at=datetime.now(timezone.utc),
            category="cloud-computing",
            category_label="Cloud Computing",
            read_time_minutes=6,
            difficulty="Advanced",
            summary="A deep dive into distributed consensus, term transitions, and log replication.",
            why_it_matters="Critical for building fault-tolerant state machine replication in distributed clouds.",
            deep_dive="Raft separates leader election, log replication, and safety. In steady state, only the leader accepts writes...",
            code_snippet="type RaftNode struct { currentTerm int; state NodeRole }",
            full_content="Full text content for testing clean reader view in DevLens.",
            key_takeaways=["Leader election guarantees single-writer safety", "Log entries are committed monotonically"],
            skills_extracted=["Distributed Systems", "Raft", "Consensus", "Go"],
            upvotes=12,
            comments_count=4,
            relevance_score=0.92,
            readability_score=68.5,
        )
        session.add(test_art)

        admin = User(
            id="test-admin-id",
            email="admin@devlens.test",
            username="test_admin",
            name="Test Admin",
            hashed_password=hash_password("adminPass123!"),
            role="admin",
        )
        session.add(admin)
        await session.commit()


# Run DB initialization once on import
asyncio.run(_bootstrap_test_db())


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify system health check endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
        assert "DevLens" in data.get("service", "")


@pytest.mark.asyncio
async def test_auth_registration_and_login_flow():
    """Verify registration, duplicate email rejection, login, and profile access."""
    test_id = uuid.uuid4().hex[:8]
    test_email = f"test_{test_id}@example.com"
    test_username = f"user_{test_id}"
    test_password = "SecurePassword123!"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register new user
        reg_payload = {
            "name": "Integration Tester",
            "email": test_email,
            "username": test_username,
            "password": test_password,
        }
        reg_resp = await client.post("/api/auth/register", json=reg_payload)
        assert reg_resp.status_code in (200, 201)
        reg_data = reg_resp.json()
        token = reg_data.get("token") or reg_data.get("access_token")
        assert token is not None

        # 2. Duplicate registration should return 409
        dup_resp = await client.post("/api/auth/register", json=reg_payload)
        assert dup_resp.status_code == 409

        # 3. Login with credentials
        login_resp = await client.post("/api/auth/login", json={
            "email": test_email,
            "password": test_password,
        })
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert login_data.get("user", {}).get("email") == test_email

        # 4. Access authenticated /me endpoint
        me_resp = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data.get("username") == test_username


@pytest.mark.asyncio
async def test_feed_delivery_structure():
    """Verify feed returns structured JSON articles with camelCase aliases."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/articles?limit=5")
        assert resp.status_code == 200
        data = resp.json()
        assert "articles" in data
        assert "total" in data
        assert "categories" in data
        assert len(data["articles"]) >= 1

        first_art = data["articles"][0]
        assert "id" in first_art
        assert "title" in first_art
        assert "relevanceScore" in first_art
        assert "readabilityScore" in first_art
        assert "deepDive" in first_art


def test_quality_scoring_algorithm_and_gate():
    """Verify 4-factor scoring algorithm and 0.65 quality threshold gate."""
    # Low quality: unknown source, empty summary, single-word title
    low_score = calculate_quality_score(
        source="Unknown Blog",
        published_at=None,
        title="Update",
        summary="Short",
        upvotes=0,
    )
    assert low_score < 0.65

    # High quality: Google DeepMind, substantive title & summary, fresh date
    now = datetime.now(timezone.utc)
    high_score = calculate_quality_score(
        source="Google DeepMind",
        published_at=now,
        title="Frontiers in Neural Scalability and Distributed Consensus",
        summary="A comprehensive architectural analysis of scalable multi-agent systems operating across globally distributed geographic zones with strict latency bounds.",
        upvotes=50,
    )
    assert high_score >= 0.85

    # Test quality gate filtering
    candidates = [
        {"title": "Low Quality", "relevance_score": low_score},
        {"title": "High Quality", "relevance_score": high_score},
    ]
    filtered = select_quality_articles(candidates, min_score=0.65)
    assert len(filtered) == 1
    assert filtered[0]["title"] == "High Quality"


def test_sha256_url_deduplication():
    """Verify SHA-256 URL hashing normalization."""
    url1 = "https://example.com/architecture/post-1"
    h1 = hash_url(url1)
    assert len(h1) == 64
    assert hash_url(url1) == hash_url("https://example.com/architecture/post-1")
    assert hash_url(url1) == hash_url("  HTTPS://EXAMPLE.COM/architecture/post-1  ")


@pytest.mark.asyncio
async def test_sync_endpoint_security_guard():
    """Verify that unauthenticated callers cannot trigger POST /api/articles/sync."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unauthenticated request must fail with 401
        resp = await client.post("/api/articles/sync")
        assert resp.status_code == 401

        # 2. Regular user (non-admin) must fail with 403
        user_token = create_access_token(data={"sub": "normal-user", "email": "user@test.local", "role": "user"})
        user_resp = await client.post(
            "/api/articles/sync",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert user_resp.status_code == 403


@pytest.mark.asyncio
async def test_quiz_generate_and_submit():
    """Verify quiz generation endpoint and submission score telemetry."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Use seeded test article
        article_id = "test-art-1"

        # Generate quiz
        quiz_resp = await client.get(f"/api/quiz/generate?articleId={article_id}")
        assert quiz_resp.status_code == 200
        quiz_data = quiz_resp.json()
        assert "questions" in quiz_data
        assert len(quiz_data["questions"]) >= 1

        q1 = quiz_data["questions"][0]
        assert "question" in q1
        assert "options" in q1
        assert "correctIndex" in q1

        # Submit quiz
        submit_resp = await client.post("/api/quiz/submit", json={
            "articleId": article_id,
            "score": 3,
            "totalQuestions": 3,
            "answers": [0, 1, 1],
        })
        assert submit_resp.status_code == 200
        submit_data = submit_resp.json()
        assert submit_data.get("percentage") == 100.0


def test_recommender_tfidf_local_similarity():
    """Verify scikit-learn TF-IDF keyword extraction and recommendation calculations."""
    keywords = extract_top_keywords("Distributed consensus algorithms and Raft replication in microservices", top_k=3)
    assert len(keywords) > 0

    class DummyArticle:
        def __init__(self, id, title, category, summary, why_it_matters, key_takeaways, skills):
            self.id = id
            self.title = title
            self.url = f"https://example.com/{id}"
            self.source = "Test Source"
            self.source_url = self.url
            self.author = "Test Author"
            self.published_at = datetime.now(timezone.utc)
            self.created_at = self.published_at
            self.category = category
            self.category_label = category
            self.read_time_minutes = 5
            self.difficulty = "Intermediate"
            self.summary = summary
            self.why_it_matters = why_it_matters
            self.key_takeaways = key_takeaways
            self.skills_extracted = skills
            self.upvotes = 0
            self.comments_count = 0
            self.relevance_score = 0.8
            self.readability_score = 70.0
            self.deep_dive = None
            self.code_snippet = None
            self.full_content = None

    art1 = DummyArticle("1", "Raft Consensus in Distributed Clouds", "cloud-computing", "Raft algorithm consensus", "", [], ["Raft"])
    art2 = DummyArticle("2", "Distributed Systems and Paxos", "cloud-computing", "Paxos consensus protocols", "", [], ["Paxos"])
    art3 = DummyArticle("3", "Frontend React CSS Styling", "web-development", "CSS styling tokens", "", [], ["CSS"])

    recs = calculate_recommendations("1", [art1, art2, art3], top_n=1)
    assert len(recs) == 1
    assert recs[0]["id"] == "2"  # art2 is mathematically closer to art1 than art3


@pytest.mark.asyncio
async def test_sync_runs_observability_and_recording():
    """Verify sync run telemetry persistence and admin-gated GET /api/articles/sync-runs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unauthenticated request must fail with 401
        unauth_resp = await client.get("/api/articles/sync-runs")
        assert unauth_resp.status_code == 401

        # 2. Non-admin request must fail with 403
        user_token = create_access_token(data={"sub": "normal-user", "email": "user@test.local", "role": "user"})
        user_resp = await client.get(
            "/api/articles/sync-runs",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert user_resp.status_code == 403

        # 3. Seed a test SyncRun row into DB
        async with TestSessionLocal() as session:
            test_run = SyncRun(
                id="test-sync-run-1",
                started_at=datetime.now(timezone.utc) - timedelta(minutes=2),
                finished_at=datetime.now(timezone.utc) - timedelta(minutes=1),
                category="cloud-computing",
                articles_fetched=10,
                articles_added=4,
                errors=["Sample warning notice"],
                status="success",
            )
            session.add(test_run)
            await session.commit()

        # 4. Admin request must succeed with 200 and return formatted telemetry
        admin_token = create_access_token(data={"sub": "test-admin-id", "email": "admin@devlens.test", "role": "admin"})
        admin_resp = await client.get(
            "/api/articles/sync-runs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_resp.status_code == 200
        data = admin_resp.json()
        assert "runs" in data
        assert data["total"] >= 1
        assert len(data["runs"]) >= 1

        run_item = next((r for r in data["runs"] if r["id"] == "test-sync-run-1"), None)
        assert run_item is not None
        assert run_item["category"] == "cloud-computing"
        assert run_item["articlesFetched"] == 10
        assert run_item["articlesAdded"] == 4
        assert run_item["status"] == "success"
        assert "Sample warning notice" in run_item["errors"]


def test_fetcher_quality_score_detailed_factors():
    """Verify 4-factor quality score behavior across freshness brackets, authority, and substance."""
    now = datetime.now(timezone.utc)

    # 1. Freshness bracket verification
    s_24h = calculate_quality_score("MDN Blog", now - timedelta(hours=6), "Building Resilient Web APIs", "Detailed architectural article on reliable HTTP clients.", 10)
    s_5d = calculate_quality_score("MDN Blog", now - timedelta(days=5), "Building Resilient Web APIs", "Detailed architectural article on reliable HTTP clients.", 10)
    s_20d = calculate_quality_score("MDN Blog", now - timedelta(days=20), "Building Resilient Web APIs", "Detailed architectural article on reliable HTTP clients.", 10)
    s_60d = calculate_quality_score("MDN Blog", now - timedelta(days=60), "Building Resilient Web APIs", "Detailed architectural article on reliable HTTP clients.", 10)
    s_none = calculate_quality_score("MDN Blog", None, "Building Resilient Web APIs", "Detailed architectural article on reliable HTTP clients.", 10)

    assert s_24h > s_5d > s_20d > s_60d
    assert s_none < s_24h

    # 2. Source authority differential (Google DeepMind: 0.92 vs default: 0.70)
    s_high_src = calculate_quality_score("Google DeepMind", now, "Neural Architectures in Practice", "Deep breakdown of distributed neural network training and parameters.", 10)
    s_low_src = calculate_quality_score("Unknown Source Blog", now, "Neural Architectures in Practice", "Deep breakdown of distributed neural network training and parameters.", 10)
    assert s_high_src > s_low_src

    # 3. Content substance penalties
    s_substantive = calculate_quality_score("Go Blog", now, "Practical Memory Optimization in Go", "An in-depth exploration of escape analysis and garbage collection tuning.", 10)
    s_shallow = calculate_quality_score("Go Blog", now, "Quick Update", "Short summary.", 10)
    assert s_substantive > s_shallow


def test_fetcher_select_quality_articles_capping_and_sorting():
    """Verify that select_quality_articles filters threshold, sorts descending, and caps at max_count."""
    articles = [
        {"id": "1", "title": "Article 1", "relevance_score": 0.60},  # Below 0.65 threshold
        {"id": "2", "title": "Article 2", "relevance_score": 0.88},
        {"id": "3", "title": "Article 3", "relevance_score": 0.72},
        {"id": "4", "title": "Article 4", "relevance_score": 0.95},
        {"id": "5", "title": "Article 5", "relevance_score": 0.78},
    ]

    # Threshold filter and sort
    selected = select_quality_articles(articles, max_count=10, min_score=0.65)
    assert len(selected) == 4
    assert [a["id"] for a in selected] == ["4", "2", "5", "3"]  # strictly descending

    # Cap enforcement (e.g. max 2)
    capped = select_quality_articles(articles, max_count=2, min_score=0.65)
    assert len(capped) == 2
    assert [a["id"] for a in capped] == ["4", "2"]

    # Empty candidate pool returns empty list safely
    assert select_quality_articles([], max_count=5) == []


def test_github_repo_filtering_and_classification():
    """Verify repo quality gate: rejection of awesome-* lists, forks, archived, spam, and correct category inference."""
    # 1. Awesome lists detection
    assert is_awesome_list("awesome-python", "A list of python tools") is True
    assert is_awesome_list("vinta/awesome-python") is True
    assert is_awesome_list("fastapi-awesome") is True
    assert is_awesome_list("my-project", "Curated list of awesome libraries") is True
    assert is_awesome_list("my-project", "Some description", topics=["awesome-list"]) is True
    assert is_awesome_list("astral-sh/uv", "An extremely fast Python package and project manager") is False

    # 2. Quality filter
    assert is_quality_repo("astral-sh/uv", "An extremely fast Python package and project manager", is_fork=False, is_archived=False) is True
    assert is_quality_repo("user/forked-repo", "Forked project", is_fork=True) is False
    assert is_quality_repo("user/old-repo", "Archived project", is_archived=True) is False
    assert is_quality_repo("user/tiny", "Short", is_fork=False) is False  # <10 chars
    assert is_quality_repo("user/crypto-giveaway-bot", "Get free airdrop tokens here", is_fork=False) is False
    assert is_quality_repo("user/awesome-go", "Curated list of Go frameworks", is_fork=False) is False

    # 3. Category inference
    assert infer_repo_category("ollama/ollama", "Get up and running with large language models", "Go", ["llm", "ai"]) == "artificial-intelligence"
    assert infer_repo_category("kubernetes/kubernetes", "Production-Grade Container Scheduling", "Go", ["k8s", "docker"]) == "cloud-computing"
    assert infer_repo_category("prometheus/prometheus", "The Prometheus monitoring system and time series database", "Go", ["monitoring", "observability"]) == "devops"
    assert infer_repo_category("vitejs/vite", "Next Generation Frontend Tooling", "TypeScript", ["frontend", "web"]) == "web-development"


@pytest.mark.asyncio
async def test_trending_repos_api_and_admin_security():
    """Verify GET /api/repos/trending delivery/filtering and POST /api/repos/sync security."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Seed a test Repo
        async with TestSessionLocal() as session:
            test_repo = Repo(
                id=99001,
                full_name="astral-sh/uv",
                url="https://github.com/astral-sh/uv",
                description="An extremely fast Python package and project manager written in Rust.",
                primary_language="Rust",
                topics=["python", "rust", "package-manager"],
                license="MIT",
                stars=45000,
                forks=1200,
                stars_gained=850,
                trending_score=49250.0,
                category="devops",
                summary="An extremely fast Python package manager and resolver written in Rust.",
                why_trending="Surging in developer adoption due to 10-100x speedups over pip.",
                key_features=["Drop-in pip replacement", "Built in Rust", "Universal lockfile support"],
                good_for="Python and systems developers seeking instant dependency resolution.",
                first_seen_at=datetime.now(timezone.utc),
                last_seen_at=datetime.now(timezone.utc),
            )
            session.add(test_repo)
            await session.commit()

        # 2. GET /api/repos/trending
        resp = await client.get("/api/repos/trending")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] >= 1
        found = next((r for r in data["items"] if r["id"] == 99001), None)
        assert found is not None
        assert found["fullName"] == "astral-sh/uv"
        assert found["primaryLanguage"] == "Rust"
        assert found["starsGained"] == 850
        assert len(found["keyFeatures"]) == 3

        # 3. Filter by language (Rust vs Python)
        resp_rust = await client.get("/api/repos/trending?language=Rust")
        assert resp_rust.status_code == 200
        assert any(r["id"] == 99001 for r in resp_rust.json()["items"])

        resp_py = await client.get("/api/repos/trending?language=NonExistentLang123")
        assert resp_py.status_code == 200
        assert not any(r["id"] == 99001 for r in resp_py.json()["items"])

        # 4. POST /api/repos/sync security
        unauth_sync = await client.post("/api/repos/sync")
        assert unauth_sync.status_code == 401

        user_token = create_access_token(data={"sub": "normal-user", "email": "user@test.local", "role": "user"})
        user_sync = await client.post("/api/repos/sync", headers={"Authorization": f"Bearer {user_token}"})
        assert user_sync.status_code == 403
