import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


DEFAULT_CATEGORIES = [
    "artificial-intelligence",
    "web-development",
    "cloud-computing",
    "cyber-security",
]


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: uuid.uuid4().hex
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Preferences & Profile Information
    selected_categories: Mapped[list] = mapped_column(
        JSON, default=DEFAULT_CATEGORIES, nullable=False
    )
    institution: Mapped[str] = mapped_column(
        String(150), default="Full-Stack & Systems Engineering", nullable=True
    )
    program: Mapped[str] = mapped_column(String(100), default="Senior Developer", nullable=True)
    batch: Mapped[str] = mapped_column(String(100), default="Active Member", nullable=True)
    supervisor: Mapped[str] = mapped_column(String(100), default="", nullable=True)

    # Reading & Engagement Analytics
    read_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    quizzes_taken: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_quiz_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now, nullable=False
    )
