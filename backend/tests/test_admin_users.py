import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.controllers import admin_controller, article_controller, auth_controller
from app.models.article import Article
from app.models.database import Base, get_db
from app.models.read_event import ReadEvent
from app.models.user import User
from app.utils.security import create_access_token


def auth(user_id, role="admin"):
    token = create_access_token({"sub": user_id, "role": role})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_removal_preserves_other_users_and_article_votes():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async def local_db():
        async with sessions() as session:
            yield session

    app = FastAPI()
    app.include_router(admin_controller.router)
    app.include_router(article_controller.router)
    app.include_router(auth_controller.router)
    app.dependency_overrides[get_db] = local_db

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with sessions.begin() as session:
            for user_id, username, email, role in (
                ("admin", "admin", "admin@example.test", "admin"),
                ("other-admin", "other_admin", "other-admin@example.test", "admin"),
                ("seed", "devlens_admin", "seed@example.test", "user"),
                ("seed-email", "legacy_admin", "admin@devlens.local", "user"),
                ("demo", "demo_reader", "demo@example.test", "user"),
                ("remaining", "remaining", "remaining@example.test", "user"),
            ):
                session.add(User(
                    id=user_id, username=username, email=email,
                    role=role, hashed_password="unused",
                ))
            for article_id, votes in (("voted", 2), ("bookmarked", 9)):
                session.add(Article(
                    id=article_id, title=article_id, url=f"https://example.test/{article_id}",
                    url_hash=article_id, source="Test", category="web-development", upvotes=votes,
                ))
            session.add_all([
                ReadEvent(user_id="demo", article_id="voted", is_upvoted=True, quiz_score=75),
                ReadEvent(user_id="demo", article_id="bookmarked", is_bookmarked=True),
                ReadEvent(user_id="remaining", article_id="voted", is_upvoted=True),
            ])

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            users_url = "/api/admin/users"
            listing = await client.get(users_url, headers=auth("admin"))
            assert listing.status_code == 200
            assert {u["id"] for u in listing.json()["users"] if u["can_remove"]} == {"demo", "remaining"}
            assert (await client.delete(f"{users_url}/demo")).status_code == 401
            assert (await client.delete(f"{users_url}/demo", headers=auth("remaining", "user"))).status_code == 403
            # A token issued before a demotion still carries its old role.
            assert (await client.delete(f"{users_url}/demo", headers=auth("remaining"))).status_code == 403
            for protected in ("admin", "other-admin", "seed", "seed-email"):
                assert (await client.delete(f"{users_url}/{protected}", headers=auth("admin"))).status_code == 403

            removed = await client.delete(f"{users_url}/demo", headers=auth("admin"))
            assert removed.status_code == 204
            assert removed.content == b""
            assert (await client.delete(f"{users_url}/demo", headers=auth("admin"))).status_code == 404
            assert (await client.get("/api/auth/me", headers=auth("demo", "user"))).status_code == 401
            assert (await client.post("/api/articles/voted/upvote", headers=auth("demo", "user"))).status_code == 401

            async with sessions() as session:
                assert await session.get(User, "demo") is None
                events = (await session.scalars(select(ReadEvent))).all()
                assert [(event.user_id, event.article_id, event.is_upvoted) for event in events] == [
                    ("remaining", "voted", True),
                ]
                assert (await session.get(Article, "voted")).upvotes == 1
                assert (await session.get(Article, "bookmarked")).upvotes == 9

            vote = await client.post("/api/articles/voted/upvote", headers=auth("remaining", "user"))
            assert vote.status_code == 200
            assert vote.json()["upvotes"] == 0
            role = await client.put(f"{users_url}/remaining/role", headers=auth("admin"), json={"role": "admin"})
            assert role.status_code == 200
            assert role.json()["new_role"] == "admin"
            assert (await client.delete(f"{users_url}/remaining", headers=auth("admin"))).status_code == 403
    finally:
        await engine.dispose()
