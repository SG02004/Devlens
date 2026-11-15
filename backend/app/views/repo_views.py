from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class RepoResponse(BaseModel):
    id: int
    full_name: str = Field(alias="fullName")
    url: str
    description: Optional[str] = None
    primary_language: Optional[str] = Field(None, alias="primaryLanguage")
    topics: List[str] = []
    license: Optional[str] = None
    stars: int = 0
    forks: int = 0
    stars_gained: int = Field(0, alias="starsGained")
    trending_score: float = Field(0.0, alias="trendingScore")
    category: str = "open-source"
    summary: Optional[str] = None
    why_trending: Optional[str] = Field(None, alias="whyTrending")
    key_features: List[str] = Field(default_factory=list, alias="keyFeatures")
    good_for: Optional[str] = Field(None, alias="goodFor")
    first_seen_at: datetime = Field(alias="firstSeenAt")
    last_seen_at: datetime = Field(alias="lastSeenAt")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class TrendingReposResponse(BaseModel):
    items: List[RepoResponse]
    total: int
    period: str = "daily"
    language: Optional[str] = None
    category: Optional[str] = None


class RepoSyncResponse(BaseModel):
    message: str
    repos_fetched: int
    repos_saved: int
    ai_summaries_generated: int
    errors: List[str] = []
