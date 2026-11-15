import os
import sys
import asyncio

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.database import init_db, engine, AsyncSessionLocal
from app.controllers.article_controller import execute_article_sync
from app.services.github_trending import execute_repo_sync

async def main():
    print("=" * 70)
    print("DEVLENS DAILY 6:00 AM IST AUTOMATED SYNC RUNNER")
    print("=" * 70)

    print("\n[1/3] Initializing database...")
    await init_db()

    print("\n[2/3] Executing article sync (36h rolling lookback window)...")
    async with AsyncSessionLocal() as session:
        article_res = await execute_article_sync(
            db=session,
            limit_per_source=4,
            lookback_hours=36,
        )
        print(f"Article Sync Result: {article_res.message}")
        print(f"  Fetched candidates: {article_res.fetched_count}")
        print(f"  Saved quality articles: {article_res.added_count}")
        if article_res.errors:
            print(f"  Warnings/Errors: {article_res.errors}")

    print("\n[3/3] Executing GitHub trending repository sync...")
    async with AsyncSessionLocal() as session:
        repo_res = await execute_repo_sync(db=session, max_summaries_per_run=5)
        print(f"Repo Sync Result: {repo_res.get('message')}")

    await engine.dispose()
    print("\n[Done] Daily synchronization completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
