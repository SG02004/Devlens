"""
DevLens Hybrid Personalization Engine ("FOR YOU" Feed Ranking)
---------------------------------------------------------------
Computes a per-user personalized ranking score using 100% local Python
standard library primitives (collections.Counter, math.exp) with zero
external API calls or heavy dependencies.

Formula:
  PersonalScore = 0.30 * RelevanceScore
                + 0.25 * SkillAffinity
                + 0.20 * CategoryAffinity
                + 0.10 * SourceAffinity
                + 0.15 * FreshnessDecay  (exp(-days_since_published / 14))

Includes:
  - Cold-start onboarding prior smoothing (< 5 read/bookmark events)
  - Anti-filter-bubble Diversity Guard (max 3 consecutive same-source cards)
  - Epsilon-exploration (1 in 8 slots surfaces top content outside top category)
"""

import math
from collections import Counter
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Any, Set

WEIGHTS = {
    "relevance": 0.30,
    "skill_affinity": 0.25,
    "category_affinity": 0.20,
    "source_affinity": 0.10,
    "freshness_decay": 0.15,
}

FRESHNESS_HALF_LIFE_DAYS = 14.0
COLD_START_THRESHOLD = 5
MAX_CONSECUTIVE_SAME_SOURCE = 3
EXPLORATION_INTERVAL = 8

# Sentinel cutoff: read_at > READ_CUTOFF means the user actually read the article
# (read_at <= READ_CUTOFF is used for bookmark-only rows that haven't been read yet)
READ_CUTOFF = datetime(2000, 1, 1, tzinfo=timezone.utc)


def _ensure_utc(dt: Optional[datetime], fallback: datetime) -> datetime:
    if dt is None:
        return fallback
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def rank_articles_for_user(
    articles: List[Any],
    user: Optional[Any] = None,
    user_events: Optional[List[Tuple[Any, Any]]] = None,
    read_article_ids: Optional[Set[str]] = None,
) -> List[Any]:
    """
    Ranks candidate articles for the 'for-you' feed mode.
    - If user is anonymous or has no events/preferences, ranks by time-decayed quality
      plus source diversity guard.
    - If user is authenticated, blends static quality with learned skill, category,
      and source affinities.
    """
    if not articles:
        return []

    now = datetime.now(timezone.utc)
    events = user_events or []
    read_ids = read_article_ids or set()

    skill_counts: Counter = Counter()
    category_counts: Counter = Counter()
    source_counts: Counter = Counter()

    # 1. Accumulate recency-weighted engagement signals from read_events
    for ev, art in events:
        if not art:
            continue
        ev_read_at = _ensure_utc(getattr(ev, "read_at", None), READ_CUTOFF)
        is_read_event = ev_read_at > READ_CUTOFF
        is_bookmarked = bool(getattr(ev, "is_bookmarked", False))

        if is_read_event and is_bookmarked:
            base_weight = 2.5
        elif is_bookmarked:
            base_weight = 2.0
        elif is_read_event:
            base_weight = 1.0
        else:
            continue

        if is_read_event:
            days_ago = max(0.0, (now - ev_read_at).total_seconds() / 86400.0)
            decay = math.exp(-days_ago / 30.0)
        else:
            decay = 1.0

        weight = base_weight * decay

        if getattr(art, "category", None):
            category_counts[art.category] += weight
        if getattr(art, "source", None):
            source_counts[art.source] += weight

        for raw_skill in (getattr(art, "skills_extracted", None) or []):
            if raw_skill and isinstance(raw_skill, str):
                skill_counts[raw_skill.strip().lower()] += weight

    # 2. Cold-start smoothing using user's onboarding selected_categories as prior
    selected_cats = getattr(user, "selected_categories", None) or []
    if selected_cats:
        prior_boost = 2.0 if len(events) < COLD_START_THRESHOLD else 0.5
        for cat in selected_cats:
            category_counts[cat] += prior_boost

    max_cat = max(category_counts.values(), default=0.0)
    max_src = max(source_counts.values(), default=0.0)
    max_skill = max(skill_counts.values(), default=0.0)

    # 3. Compute hybrid PersonalScore for each candidate article
    scored_pairs = []
    for art in articles:
        rel = float(getattr(art, "relevance_score", 0.5) or 0.5)

        cat_aff = (
            category_counts.get(art.category, 0.0) / max_cat
            if max_cat > 0
            else 0.5
        )
        src_aff = (
            source_counts.get(art.source, 0.0) / max_src
            if max_src > 0
            else 0.0
        )

        art_skills = [
            s.strip().lower()
            for s in (getattr(art, "skills_extracted", None) or [])
            if s and isinstance(s, str) and s.strip()
        ]
        if art_skills and max_skill > 0:
            norm_divisor = max(1, min(len(art_skills), 3))
            skill_aff = min(
                1.0,
                sum(skill_counts.get(s, 0.0) / max_skill for s in art_skills) / norm_divisor,
            )
        else:
            skill_aff = 0.0

        pub_dt = _ensure_utc(
            getattr(art, "published_at", None) or getattr(art, "created_at", None),
            now,
        )
        days_old = max(0.0, (now - pub_dt).total_seconds() / 86400.0)
        freshness = math.exp(-days_old / FRESHNESS_HALF_LIFE_DAYS)

        personal_score = (
            WEIGHTS["relevance"] * rel
            + WEIGHTS["skill_affinity"] * skill_aff
            + WEIGHTS["category_affinity"] * cat_aff
            + WEIGHTS["source_affinity"] * src_aff
            + WEIGHTS["freshness_decay"] * freshness
        )

        # Gentle unread nudge (+0.025) so fresh unread articles surface above already-read ones
        if getattr(art, "id", None) not in read_ids:
            personal_score += 0.025

        scored_pairs.append((personal_score, rel, pub_dt.timestamp(), art))

    scored_pairs.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
    remaining = [item[3] for item in scored_pairs]

    # 4. Apply Diversity Guard (max 3 consecutive same-source) & Epsilon-Exploration (1 in 8)
    top_category = (
        max(category_counts, key=category_counts.get)
        if category_counts
        else None
    )

    ranked: List[Any] = []
    while remaining:
        pos = len(ranked)
        is_exploration_slot = (
            top_category is not None
            and (pos + 1) % EXPLORATION_INTERVAL == 0
        )

        def _violates_source_cap(candidate_source: str) -> bool:
            if len(ranked) < MAX_CONSECUTIVE_SAME_SOURCE:
                return False
            tail = ranked[-MAX_CONSECUTIVE_SAME_SOURCE:]
            return all(getattr(x, "source", None) == candidate_source for x in tail)

        chosen_idx = None

        if is_exploration_slot:
            for idx, cand in enumerate(remaining):
                if (
                    getattr(cand, "category", None) != top_category
                    and not _violates_source_cap(getattr(cand, "source", ""))
                ):
                    chosen_idx = idx
                    break

        if chosen_idx is None:
            for idx, cand in enumerate(remaining):
                if not _violates_source_cap(getattr(cand, "source", "")):
                    chosen_idx = idx
                    break

        if chosen_idx is None:
            chosen_idx = 0

        ranked.append(remaining.pop(chosen_idx))

    return ranked
