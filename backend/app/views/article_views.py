from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ArticleResponse(BaseModel):
    id: str
    title: str
    url: str
    source: str
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    author: Optional[str] = "DevLens Editorial"
    published_at: Optional[datetime] = Field(None, alias="publishedAt")
    category: str
    category_label: Optional[str] = Field(None, alias="categoryLabel")
    read_time_minutes: int = Field(5, alias="readTimeMinutes")
    difficulty: str = "Intermediate"
    summary: Optional[str] = None
    why_it_matters: Optional[str] = Field(None, alias="whyItMatters")
    key_takeaways: List[str] = Field(default_factory=list, alias="keyTakeaways")
    skills_extracted: List[str] = Field(default_factory=list, alias="skillsExtracted")
    upvotes: int = 0
    comments_count: int = Field(0, alias="commentsCount")
    relevance_score: float = Field(0.5, alias="relevanceScore")
    is_bookmarked: bool = Field(False, alias="isBookmarked")
    is_read: bool = Field(False, alias="isRead")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )

    @classmethod
    def from_orm_article(cls, article, is_bookmarked: bool = False, is_read: bool = False):
        return cls(
            id=article.id,
            title=article.title,
            url=article.url,
            source=article.source,
            source_url=article.source_url or article.url,
            author=article.author or f"{article.source} Team",
            published_at=article.published_at or article.created_at,
            category=article.category,
            category_label=article.category_label or article.category.replace("-", " ").title(),
            read_time_minutes=article.read_time_minutes,
            difficulty=article.difficulty,
            summary=article.summary,
            why_it_matters=article.why_it_matters,
            key_takeaways=article.key_takeaways or [],
            skills_extracted=article.skills_extracted or [],
            upvotes=article.upvotes,
            comments_count=article.comments_count,
            relevance_score=article.relevance_score,
            is_bookmarked=is_bookmarked,
            is_read=is_read,
        )


class FeedResponse(BaseModel):
    articles: List[ArticleResponse]
    items: Optional[List[ArticleResponse]] = None
    total: int
    categories: List[str]
    filter: Optional[str] = "all"


class SyncResponse(BaseModel):
    message: str
    articles_fetched: int
    articles_added: int
    errors: List[str] = []
