"""
Quiz Controller — Phase 4
Provides endpoints for AI-grounded technical verification quizzes:
  GET  /api/quiz/generate?articleId=... → Generates 3 grounded multiple-choice questions
  POST /api/quiz/submit                 → Submits answers, calculates score & updates user telemetry
"""

import json
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.models.database import get_db
from app.models.article import Article
from app.models.user import User
from app.models.read_event import ReadEvent
from app.utils.security import get_optional_user
from app.utils.config import settings

logger = logging.getLogger("devlens.quiz")

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])

GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.8-flash-lite",
]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

QUIZ_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "questions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "STRING"},
                    "question": {"type": "STRING"},
                    "options": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"},
                        "description": "Exactly 4 multiple-choice options."
                    },
                    "correctIndex": {
                        "type": "INTEGER",
                        "description": "0-based index of the correct option (0, 1, 2, or 3)."
                    },
                    "explanation": {
                        "type": "STRING",
                        "description": "Clear explanation of why this answer is correct based on engineering principles."
                    },
                    "keywordsCovered": {
                        "type": "ARRAY",
                        "items": {"type": "STRING"}
                    }
                },
                "required": ["id", "question", "options", "correctIndex", "explanation"]
            }
        }
    },
    "required": ["questions"]
}


def _generate_fallback_questions(article: Article) -> List[Dict[str, Any]]:
    """Deterministic fallback questions grounded on article metadata when AI is unavailable."""
    skills = article.skills_extracted or [article.category.replace("-", " ").title()]
    takeaways = article.key_takeaways or [f"Core engineering principles of {article.title}"]

    q1_text = f"What core technical domain does the architecture in \"{article.title}\" primarily optimize?"
    q1_options = [
        f"High-throughput resilience and scalability within {article.category.replace('-', ' ').title()}",
        "Complete deprecation of network encryption in favor of uncompressed serialization",
        "Manual monolithic synchronization without concurrency primitives",
        "Replacement of automated telemetry with manual server logging",
    ]

    q2_text = f"According to key takeaways, which concept is most fundamental to this system?"
    primary_takeaway = takeaways[0] if takeaways else "Fault-tolerant distributed execution"
    q2_options = [
        "Unbounded synchronous blocking across microservice boundaries",
        primary_takeaway,
        "Elimination of persistent storage in favor of volatile client cache",
        "Hard-coded IP address routing without DNS resolution",
    ]

    q3_text = f"Which skill or mechanism is directly highlighted in {article.source}'s analysis?"
    primary_skill = skills[0] if skills else "Distributed Systems"
    q3_options = [
        "Legacy single-threaded event polling",
        f"Modern implementations of {primary_skill} and architectural design patterns",
        "Unauthenticated open RPC listeners on public subnets",
        "Bypassing runtime validation to minimize CPU cycles",
    ]

    return [
        {
            "id": f"q1-{article.id}",
            "question": q1_text,
            "options": q1_options,
            "correctIndex": 0,
            "explanation": f"The article focuses on architectural efficiency and scalability within {article.category.replace('-', ' ').title()}.",
            "keywordsCovered": skills[:2],
        },
        {
            "id": f"q2-{article.id}",
            "question": q2_text,
            "options": q2_options,
            "correctIndex": 1,
            "explanation": f"The key engineering finding emphasizes: {primary_takeaway}.",
            "keywordsCovered": ["Architecture", "Resilience"],
        },
        {
            "id": f"q3-{article.id}",
            "question": q3_text,
            "options": q3_options,
            "correctIndex": 1,
            "explanation": f"The technical evaluation highlights {primary_skill} as a core design priority.",
            "keywordsCovered": [primary_skill],
        },
    ]


@router.get("/generate")
async def generate_quiz(
    articleId: str = Query(..., description="UUID of the article to generate a quiz for"),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates 3-5 grounded technical verification questions for an article.
    Uses Gemini Flash if configured, with automatic deterministic fallback.
    """
    article = await db.get(Article, articleId)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Article '{articleId}' not found."
        )

    api_key = settings.GEMINI_API_KEY.strip()
    if api_key:
        context_text = f"Title: {article.title}\nCategory: {article.category}\nSource: {article.source}\nSummary: {article.summary or ''}\nTakeaways: {' | '.join(article.key_takeaways or [])}\n"
        if getattr(article, "deep_dive", None):
            context_text += f"\nDeep Dive: {article.deep_dive[:2000]}"
        elif getattr(article, "full_content", None):
            context_text += f"\nContent: {article.full_content[:2000]}"

        prompt = f"""You are a Principal Technical Interviewer and examiner at DevLens.
Generate exactly 3 high-signal, multiple-choice technical verification questions based STRICTLY on the article context below.

RULES:
1. Grounding: Questions must test actual comprehension of technical mechanisms, tradeoffs, and concepts mentioned in the text.
2. Structure: Each question must have exactly 4 options and 1 correct answer (0-based correctIndex).
3. Quality: Plausible distractors (no silly answers). High-signal technical explanations.

ARTICLE CONTEXT:
{context_text}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
                "responseSchema": QUIZ_SCHEMA,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                for model_name in GEMINI_MODELS:
                    url = f"{GEMINI_BASE_URL}/{model_name}:generateContent"
                    resp = await client.post(
                        url,
                        params={"key": api_key},
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        text_part = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(text_part)
                        questions = parsed.get("questions", [])
                        if questions and len(questions) >= 2:
                            return {
                                "articleId": article.id,
                                "articleTitle": article.title,
                                "questions": questions,
                                "source": "gemini-flash",
                            }
        except Exception as e:
            logger.warning(f"Gemini quiz generation failed for article {articleId}: {e}")

    # Fallback questions
    return {
        "articleId": article.id,
        "articleTitle": article.title,
        "questions": _generate_fallback_questions(article),
        "source": "deterministic-fallback",
    }


class QuizSubmitRequest(BaseModel):
    articleId: str
    score: int = Field(..., ge=0)
    totalQuestions: int = Field(..., ge=1)
    answers: Optional[List[int]] = None


@router.post("/submit")
async def submit_quiz(
    payload: QuizSubmitRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits quiz score and persists telemetry to ReadEvent and User models.
    """
    score_pct = round((payload.score / max(1, payload.totalQuestions)) * 100, 1)

    if current_user:
        # Check or create ReadEvent for this user and article
        stmt = select(ReadEvent).where(
            ReadEvent.user_id == current_user.id,
            ReadEvent.article_id == payload.articleId,
        )
        result = await db.execute(stmt)
        read_event = result.scalar_one_or_none()

        if not read_event:
            read_event = ReadEvent(
                user_id=current_user.id,
                article_id=payload.articleId,
                quiz_score=score_pct,
            )
            db.add(read_event)
        else:
            read_event.quiz_score = max(read_event.quiz_score or 0.0, score_pct)

        # Update User aggregate stats
        prev_quizzes = current_user.quizzes_taken or 0
        prev_avg = current_user.average_quiz_score or 0.0
        new_total_quizzes = prev_quizzes + 1
        new_avg = round(((prev_avg * prev_quizzes) + score_pct) / new_total_quizzes, 1)

        current_user.quizzes_taken = new_total_quizzes
        current_user.average_quiz_score = new_avg

        await db.commit()

    return {
        "message": "Quiz submitted successfully",
        "score": payload.score,
        "total": payload.totalQuestions,
        "percentage": score_pct,
        "recorded": bool(current_user),
    }
