"""
DevLens Content-Based Recommendation Engine
---------------------------------------------
Uses Scikit-Learn TF-IDF (Term Frequency - Inverse Document Frequency)
and Cosine Similarity to recommend mathematically related articles.

Runs 100% locally on the CPU with zero external API calls.
"""

from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def extract_top_keywords(
    doc_text: str,
    top_k: int = 5,
) -> List[str]:
    """
    Extracts top salient keywords from text using local TF-IDF vectorization.
    """
    if not doc_text or len(doc_text.strip()) < 10:
        return []

    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=500,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        tfidf_mat = vectorizer.fit_transform([doc_text])
        features = vectorizer.get_feature_names_out()
        scores = tfidf_mat.toarray()[0]
        top_indices = scores.argsort()[::-1][:top_k]
        return [features[i] for i in top_indices if scores[i] > 0]
    except Exception:
        return []


# Lightweight in-process cache: stores (cache_key, tfidf_matrix, feature_names, id_to_idx)
_TFIDF_CACHE: Dict[str, Any] = {}


def calculate_recommendations(
    target_article_id: str,
    articles: List[Any],
    top_n: int = 3,
) -> List[Dict[str, Any]]:
    """
    Computes pairwise TF-IDF cosine similarity between a target article
    and a candidate pool of articles.
    
    Returns the top_n most similar articles with matchPercentage and
    explainable matchedKeywords. Uses an in-process matrix cache keyed
    by the article pool signature for sub-millisecond repeat lookups.
    """
    if len(articles) <= 1:
        return []

    def _get_id(a: Any) -> Optional[str]:
        return a.get("id") if isinstance(a, dict) else getattr(a, "id", None)

    # 1. Locate the target article index in the list
    target_idx = None
    for idx, art in enumerate(articles):
        if _get_id(art) == target_article_id:
            target_idx = idx
            break

    if target_idx is None:
        return []

    cache_key = (len(articles), _get_id(articles[0]), _get_id(articles[-1]))

    if _TFIDF_CACHE.get("key") == cache_key and _TFIDF_CACHE.get("id_map", {}).get(target_article_id) == target_idx:
        tfidf_matrix = _TFIDF_CACHE["matrix"]
        feature_names = _TFIDF_CACHE["features"]
    else:
        # 2. Extract technical text documents (Title + Summary + Category + Skills)
        # Give higher domain weight to title and technical skills
        documents = []
        id_map = {}
        for idx, art in enumerate(articles):
            art_id = _get_id(art)
            if art_id:
                id_map[art_id] = idx
            if isinstance(art, dict):
                title = art.get("title", "")
                summary = art.get("summary", "") or ""
                category = art.get("category", "") or ""
                skills = " ".join(art.get("skills_extracted", []) or art.get("skillsExtracted", []) or [])
            else:
                title = getattr(art, "title", "")
                summary = getattr(art, "summary", "") or ""
                category = getattr(art, "category", "") or ""
                skills = " ".join(getattr(art, "skills_extracted", []) or [])

            # Weight technical skills and title heavily for high domain affinity
            doc = f"{title} {title} {skills} {skills} {category} {summary}".strip()
            documents.append(doc)

        # 3. Fit TF-IDF Vectorizer with unigrams and bigrams + sublinear TF
        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),  # capture 'cloud computing', 'distributed systems', etc.
            sublinear_tf=True,   # 1 + log(tf) prevents dominant repeated terms
        )

        try:
            tfidf_matrix = vectorizer.fit_transform(documents)
        except ValueError:
            # Fallback if empty vocabulary
            return []

        feature_names = np.array(vectorizer.get_feature_names_out())
        _TFIDF_CACHE["key"] = cache_key
        _TFIDF_CACHE["matrix"] = tfidf_matrix
        _TFIDF_CACHE["features"] = feature_names
        _TFIDF_CACHE["id_map"] = id_map

    # 4. Compute Cosine Similarity between target article and all other articles
    similarity_vector = cosine_similarity(tfidf_matrix[target_idx], tfidf_matrix)[0]

    # 5. Extract target row for explainable AI keyword matching
    target_row = tfidf_matrix[target_idx].toarray()[0]

    # 6. Sort by descending similarity, excluding the target article itself
    ranked_indices = [
        i for i in similarity_vector.argsort()[::-1]
        if i != target_idx
    ]

    recommendations = []
    for i in ranked_indices[:top_n]:
        art = articles[i]
        sim_score = float(similarity_vector[i])
        match_percentage = round(sim_score * 100, 1)

        # Compute explainable matched keywords (features with highest shared dot product)
        cand_row = tfidf_matrix[i].toarray()[0]
        common_weights = target_row * cand_row
        top_feature_indices = common_weights.argsort()[::-1][:4]
        matched_keywords = [
            str(feature_names[f_idx])
            for f_idx in top_feature_indices
            if common_weights[f_idx] > 0
        ]

        if isinstance(art, dict):
            rec = dict(art)
        else:
            from app.views.article_views import ArticleResponse
            rec = ArticleResponse.from_orm_article(art).model_dump(by_alias=True)

        rec["similarityScore"] = sim_score
        rec["matchPercentage"] = match_percentage
        rec["matchedKeywords"] = matched_keywords
        recommendations.append(rec)

    return recommendations

