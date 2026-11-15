import json
import logging
import re
from typing import Optional, Dict, Any, List
import httpx
from app.utils.config import settings

logger = logging.getLogger("devlens.summariser")

# Google Gemini endpoints — primary gemini-3.8-flash with flash-lite fallback
GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.8-flash-lite",
]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# Groq endpoints & models — fast, highly available secondary AI provider
GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
]
GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"

# Disallowed non-technical terms, locations, and noisy stopwords
DISALLOWED_TERMS = {
    # Geographic locations & geopolitical entities
    "singapore", "denmark", "us", "usa", "uk", "china", "india", "japan",
    "germany", "france", "australia", "canada", "california", "london",
    "europe", "asia", "america", "africa", "country", "national", "government",
    # Common verbs, generic noise, and non-technical reporting words
    "said", "company", "companies", "people", "cpr", "scam", "scams", "fraud",
    "threat", "threats", "safeguard", "safeguards", "access", "requests", "request",
    "traffic", "spend", "channel", "channels", "demand", "evidence", "design",
    "today", "year", "years", "month", "months", "day", "days", "time", "news",
    "report", "reports", "update", "updates", "state", "states",
    # Single generic words that are meaningless without qualification
    "model", "models", "device", "devices", "text", "audio", "video",
    "image", "images", "ai", "web", "data", "tool", "tools", "service",
    "services", "application", "applications", "inf", "xml", "test",
    "tests", "human", "humans", "code", "writing", "judge",
}

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
            "description": "4-5 concise, high-signal engineering bullet points.",
        },
        "deep_dive": {
            "type": "STRING",
            "description": "A comprehensive 3-4 paragraph technical breakdown explaining how the system or technique works under the hood, key mechanisms, architectural trade-offs, scalability considerations, and real-world failure modes.",
        },
        "code_or_pattern": {
            "type": "STRING",
            "description": "A concise, representative code snippet, config block, CLI invocation, or ascii architecture pattern that illustrates the core technical mechanism.",
        },
        "difficulty": {
            "type": "STRING",
            "enum": ["Beginner", "Intermediate", "Advanced"],
            "description": "Assessed technical depth.",
        },
        "skills_extracted": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "3-6 distinct technical skills, programming languages, frameworks, libraries, protocols, or concrete systems architecture concepts (e.g., 'Kafka', 'PostgreSQL', 'Transactional Outbox', 'PyTorch', 'eBPF'). STRICT RULE: NEVER output geographic locations, generic nouns ('Model', 'Device', 'Text', 'Audio', 'Said'), crime/news topics ('Scam'), or organization names.",
        },
    },
    "required": ["summary", "why_it_matters", "key_takeaways", "deep_dive", "difficulty", "skills_extracted"],
}


def sanitize_skills(skills: Optional[List[str]]) -> List[str]:
    """
    Deterministically purifies extracted skills:
    1. Strips leading/trailing noise, punctuation, hashtags.
    2. Drops geographic entities (e.g. 'Singapore', 'Denmark').
    3. Drops generic non-technical nouns & common verbs ('Model', 'Said', 'Scam').
    4. Preserves compound technical terms (e.g. 'Audio Spectrogram', 'On-Device ML').
    5. Deduplicates case-insensitively.
    """
    if not skills:
        return []

    cleaned = []
    seen = set()

    for raw in skills:
        if not raw or not isinstance(raw, str):
            continue

        s = raw.strip().lstrip("#").strip().strip("\"'`;,.")
        if not s:
            continue

        # Balance parentheses if trailing bracket was cut off
        if s.count("(") > s.count(")"):
            s = s + ")"
        elif s.count(")") > s.count("("):
            s = s.rstrip(")")

        s_lower = s.lower()

        # Reject exact blacklist matches
        if s_lower in DISALLOWED_TERMS:
            continue

        # If it's a single word without spaces or hyphens, enforce strict checks
        if " " not in s and "-" not in s:
            if len(s) < 3 and s.upper() not in {"GO", "C", "R"}:
                continue
            if s_lower in DISALLOWED_TERMS:
                continue

        if s_lower not in seen:
            seen.add(s_lower)
            # Ensure nice casing: if all lowercase or all uppercase (and > 3 chars), title-case it
            if s.islower():
                s = s.title()
            cleaned.append(s)

    return cleaned[:6]


def _build_prompt(title: str, source: str, category: str, clean_content: str) -> str:
    return f"""You are a Principal Software Architect and technical editor at DevLens.
Analyze the following engineering article and generate an insightful, high-signal technical analysis in strict JSON.

CRITICAL RULES:
1. Grounding: Summarize ONLY based on facts in the provided text. Do NOT fabricate metrics, benchmarks, or claims.
2. Tone: Engineering-first, precise, educational, and engaging. Avoid dry fluff, marketing buzzwords, or hand-waving.
3. Depth: In 'deep_dive', provide a substantial explanation (3-4 paragraphs) breaking down:
   - The core underlying mechanism or architecture
   - Practical trade-offs (e.g. latency vs consistency, memory vs CPU)
   - Real-world production implications and failure modes
4. Code/Pattern: Provide a representative code snippet, config block, or architecture pattern in 'code_or_pattern'.
5. Technical Skills ('skills_extracted'): Extract 3-6 specific technologies, libraries, protocols, or concrete systems architecture concepts (e.g. 'On-Device Inference', 'NPU Acceleration', 'Transformer Architecture', 'Audio Spectrogram Analysis', 'Privacy-Preserving ML').
6. STRICT PROHIBITION: NEVER include geographic locations/countries/cities (e.g. 'Singapore'), non-technical news topics (e.g. 'Scam'), generic nouns (e.g. 'Model', 'Device', 'Text', 'Audio'), or common verbs (e.g. 'Said').
7. Category: {category}
8. Source: {source}

ARTICLE TITLE: {title}

ARTICLE CONTENT:
{clean_content}
"""


async def _summarise_with_gemini_internal(
    title: str,
    source: str,
    category: str,
    clean_content: str,
) -> Optional[Dict[str, Any]]:
    """Tries Google Gemini models with a fast 6-second timeout."""
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key:
        return None

    prompt = _build_prompt(title, source, category, clean_content)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
            "responseSchema": SUMMARY_SCHEMA,
        },
    }

    async with httpx.AsyncClient(timeout=3.5) as client:
        for model_name in GEMINI_MODELS:
            url = f"{GEMINI_BASE_URL}/{model_name}:generateContent"
            try:
                resp = await client.post(
                    url,
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
                elif resp.status_code in (429, 503, 404):
                    continue
                else:
                    logger.warning(f"Gemini API ({model_name}) returned {resp.status_code}: {resp.text[:120]}")
            except Exception as e:
                logger.warning(f"Gemini ({model_name}) error for '{title}': {e}")
                if isinstance(e, (httpx.TimeoutException, httpx.NetworkError)):
                    # Network / timeout to Gemini endpoint -> fail fast to secondary provider (Groq)
                    break

    return None


async def _summarise_with_groq_internal(
    title: str,
    source: str,
    category: str,
    clean_content: str,
) -> Optional[Dict[str, Any]]:
    """Tries Groq API models (OpenAI-compatible) with sub-second response times."""
    api_key = settings.GROQ_API_KEY.strip()
    if not api_key:
        return None

    prompt = _build_prompt(title, source, category, clean_content)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # Trim to 4000 chars for optimal Groq TPM headroom
    trimmed_content = clean_content[:4000]

    async with httpx.AsyncClient(timeout=12.0) as client:
        for model_name in GROQ_MODELS:
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a Principal Software Architect. You produce authoritative, "
                            "deep technical analysis in strict JSON adhering to the requested schema. "
                            "Never output geographic locations or generic non-technical words as skills."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
            }
            try:
                resp = await client.post(GROQ_BASE_URL, headers=headers, json=payload)
                if resp.status_code == 200:
                    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                    if content:
                        parsed = json.loads(content)
                        logger.info(f"Successfully summarized '{title}' using Groq ({model_name})")
                        return parsed
                elif resp.status_code in (429, 503, 404):
                    continue
                else:
                    logger.warning(f"Groq API ({model_name}) returned {resp.status_code}: {resp.text[:120]}")
            except Exception as e:
                logger.warning(f"Groq ({model_name}) error for '{title}': {e}")

    return None


async def summarise_article(
    title: str,
    source: str,
    category: str,
    article_text: str,
) -> Optional[Dict[str, Any]]:
    """
    Multi-LLM cascaded summarizer:
    1. Primary: Google Gemini 3.8 Flash (6s fast-fail timeout)
    2. Secondary: Groq API (openai/gpt-oss-120b, openai/gpt-oss-20b)
    3. Post-Extraction: Deterministic skill sanitizer ensuring NO geographic/generic junk.
    """
    clean_content = article_text[:6000] if article_text else ""
    if len(clean_content.split()) < 20:
        return None

    result = None

    # Step 1: Attempt Gemini
    try:
        result = await _summarise_with_gemini_internal(title, source, category, clean_content)
    except Exception as e:
        logger.warning(f"Gemini summarizer failed for '{title}': {e}")

    # Step 2: Fallback to Groq if Gemini returned None
    if not result:
        try:
            result = await _summarise_with_groq_internal(title, source, category, clean_content)
        except Exception as e:
            logger.warning(f"Groq summarizer failed for '{title}': {e}")

    # Step 3: Sanitize skills in result
    if result and isinstance(result, dict):
        raw_skills = result.get("skills_extracted", [])
        result["skills_extracted"] = sanitize_skills(raw_skills)

    return result


# Backwards compatibility alias for existing controllers
summarise_with_gemini = summarise_article
