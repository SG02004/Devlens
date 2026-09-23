import json
import logging
from typing import Optional, Dict, Any, List
import httpx
from app.utils.config import settings

logger = logging.getLogger("devlens.summariser")

# Google Gemini endpoint — use gemini-2.5-flash (confirmed available for this API key)
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

SUMMARY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "summary": {
            "type": "STRING",
            "description": "A crisp, technical 2-3 sentence executive summary explaining the core architectural concept, design decision, or finding.",
        },
        "why_it_matters": {
            "type": "STRING",
            "description": "1-2 sentences on why this matters to distributed systems engineers and architects in production environments.",
        },
        "key_takeaways": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "3-4 concise, high-signal engineering bullet points.",
        },
        "difficulty": {
            "type": "STRING",
            "enum": ["Beginner", "Intermediate", "Advanced"],
            "description": "Assessed technical depth.",
        },
        "skills_extracted": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "3-6 key technologies, protocols, or engineering concepts extracted directly from the text.",
        },
    },
    "required": ["summary", "why_it_matters", "key_takeaways", "difficulty", "skills_extracted"],
}


async def summarise_with_gemini(
    title: str,
    source: str,
    category: str,
    article_text: str,
) -> Optional[Dict[str, Any]]:
    """
    Generates a structured, grounded engineering summary using Google Gemini.
    Anti-Hallucination Triad:
    1. Temperature 0.1 (near-deterministic)
    2. ResponseSchema (strict JSON structure)
    3. Grounding System Prompt ("Summarize ONLY from the provided text")
    """
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key:
        return None

    clean_content = article_text[:6000] if article_text else ""
    if len(clean_content.split()) < 20:
        return None

    prompt = f"""You are a Principal Software Architect and technical editor at DevLens.
Analyze the following engineering article and generate a grounded, structured summary.

RULES:
1. Grounding: Summarize ONLY based on the facts in the provided text. Do NOT fabricate metrics, benchmarks, or claims.
2. Tone: Engineering-first, precise, no marketing fluff or filler words.
3. Category: {category}
4. Source: {source}

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{clean_content}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "responseSchema": SUMMARY_SCHEMA,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                GEMINI_API_URL,
                params={"key": api_key},
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code == 200:
                data = resp.json()
                candidate_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                if candidate_text:
                    return json.loads(candidate_text)
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Failed to generate Gemini summary for '{title}': {e}")

    return None
