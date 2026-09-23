from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.user import User
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.views.auth_views import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    PreferencesUpdateRequest,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Registers a new user, hashes their password, and returns a JWT token."""
    email_clean = payload.email.strip().lower()
    username_clean = (payload.username or email_clean.split("@")[0]).strip().lower()

    # Check for existing email or username
    query = select(User).where(or_(User.email == email_clean, User.username == username_clean))
    result = await db.execute(query)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if existing_user.email == email_clean:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please sign in instead.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This username is already taken. Please choose another.",
        )

    # Hash password and create User record
    new_user = User(
        email=email_clean,
        username=username_clean,
        name=payload.name or username_clean.capitalize(),
        hashed_password=hash_password(payload.password),
        selected_categories=payload.get_categories(),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate JWT token
    token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    user_response = UserResponse.from_orm_user(new_user)

    return TokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_response,
    )


@router.post("/login", response_model=TokenResponse)
async def login_user(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticates a user by either username or email and returns a JWT token."""
    try:
        identifier = payload.identifier.lower()
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    # Search by email or username
    query = select(User).where(or_(User.email == identifier, User.username == identifier))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email or username. Please sign up first.",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.id, "email": user.email})
    user_response = UserResponse.from_orm_user(user)

    return TokenResponse(
        token=token,
        access_token=token,
        token_type="bearer",
        user=user_response,
    )


@router.get("/me")
@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Returns the authenticated user's profile and preferences."""
    user_res = UserResponse.from_orm_user(current_user)
    return {"user": user_res, **user_res.model_dump()}


@router.put("/preferences")
@router.put("/categories")
async def update_user_preferences(
    payload: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates the user's selected category preferences."""
    categories = payload.get_categories()
    current_user.selected_categories = categories
    await db.commit()
    await db.refresh(current_user)

    user_res = UserResponse.from_orm_user(current_user)
    return {"user": user_res, **user_res.model_dump()}
