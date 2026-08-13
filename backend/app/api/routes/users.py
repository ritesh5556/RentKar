"""User endpoints: public profile + self update."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.user import UserMe, UserPublic, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(user_id: int, db: DbSession) -> UserPublic:
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return UserPublic.model_validate(user)


@router.patch("/me", response_model=UserMe)
async def update_me(data: UserUpdate, user: CurrentUser, db: DbSession) -> UserMe:
    # Only whitelisted fields (from UserUpdate) can change — no mass assignment.
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return UserMe.model_validate(user)
