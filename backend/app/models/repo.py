from datetime import datetime, timezone, date
from typing import Optional, List
from sqlalchemy import String, Integer, Float, DateTime, Date, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class Repo(Base):
    __tablename__ = "repos"

    # GitHub numeric repo id (survives repo renames)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), unique=True, index=True, nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    topics: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    license: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    forks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stars_gained: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    trending_score: Mapped[float] = mapped_column(Float, default=0.0, index=True, nullable=False)

    category: Mapped[str] = mapped_column(String(50), default="open-source", index=True, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    why_trending: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    key_features: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    good_for: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    readme_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )


class RepoSnapshot(Base):
    __tablename__ = "repo_snapshots"

    repo_id: Mapped[int] = mapped_column(ForeignKey("repos.id", ondelete="CASCADE"), primary_key=True)
    snapshot_date: Mapped[date] = mapped_column(Date, primary_key=True)
    stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    forks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
