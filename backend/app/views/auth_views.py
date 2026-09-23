import re
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

    @property
    def identifier(self) -> str:
        """Returns the identifier used for login (username or email)."""
        val = (self.username or self.email or "").strip()
        if not val:
            raise ValueError("Must provide either username or email")
        return val


class RegisterRequest(BaseModel):
    username: Optional[str] = None
    email: str
    password: str
    name: Optional[str] = None
    selectedCategories: Optional[List[str]] = Field(default=None, alias="selectedCategories")
    selected_categories: Optional[List[str]] = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if not clean:
            raise ValueError("Email address cannot be empty.")
        if "@" not in clean:
            raise ValueError("Please provide a valid email containing '@' (e.g. user@gmail.com).")
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Please provide a valid email with a domain (e.g. user@gmail.com or user@college.edu).")
        return clean

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v.strip()) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        # bcrypt rejects passwords longer than 72 bytes with an exception.
        # Convert that into a normal validation response instead of a 500.
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer.")
        return v

    def get_categories(self) -> List[str]:
        return self.selectedCategories or self.selected_categories or [
            "artificial-intelligence",
            "web-development",
            "cloud-computing",
            "cyber-security",
        ]


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    name: Optional[str] = None
    institution: Optional[str] = "Full-Stack & Systems Engineering"
    program: Optional[str] = "Senior Developer"
    batch: Optional[str] = "Active Member"
    supervisor: Optional[str] = ""
    selectedCategories: List[str]
    readCount: int = 0
    quizzesTaken: int = 0
    averageQuizScore: float = 0.0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @classmethod
    def from_orm_user(cls, user) -> "UserResponse":
        return cls(
            id=user.id,
            username=user.username,
            email=user.email,
            name=user.name or user.username,
            institution=user.institution or "Full-Stack & Systems Engineering",
            program=user.program or "Senior Developer",
            batch=user.batch or "Active Member",
            supervisor=user.supervisor or "",
            selectedCategories=user.selected_categories or [],
            readCount=user.read_count,
            quizzesTaken=user.quizzes_taken,
            averageQuizScore=user.average_quiz_score,
        )


class TokenResponse(BaseModel):
    token: str
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PreferencesUpdateRequest(BaseModel):
    selectedCategories: Optional[List[str]] = Field(default=None, alias="selectedCategories")
    selected_categories: Optional[List[str]] = None

    model_config = ConfigDict(populate_by_name=True)

    def get_categories(self) -> List[str]:
        return self.selectedCategories or self.selected_categories or []


class ProfileUpdateRequest(BaseModel):
    """The editable, non-authentication fields on a user's profile."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[str] = None
    institution: Optional[str] = Field(default=None, max_length=150)
    program: Optional[str] = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Please provide a valid email with a domain (e.g. user@gmail.com).")
        return clean

    @field_validator("name", "institution", "program")
    @classmethod
    def trim_text(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v is not None else None
