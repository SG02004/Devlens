"""
One-time migration: clear all old articles with score=0 (pre-scoring era).
Run from backend/ directory: py -3.13 migrate_articles.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import delete
from app.models.database import engine, init_db
from app.models.article import Article


async def main():
    await init_db()

    async with engine.begin() as conn:
        result = await conn.execute(
            delete(Article).where(Article.relevance_score == 0.0)
        )
        print(f"Deleted {result.rowcount} old zero-scored articles.")

    await engine.dispose()
    print("Done. Run /api/articles/sync to repopulate with quality-scored articles.")


asyncio.run(main())
