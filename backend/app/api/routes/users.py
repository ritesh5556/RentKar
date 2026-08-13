"""User endpoints: public profile + self update."""

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.user import (
    IdentityVerificationRequest,
    UserMe,
    UserPublic,
    UserUpdate,
)

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


@router.post("/me/verify-identity", response_model=UserMe)
async def verify_identity(
    data: IdentityVerificationRequest, user: CurrentUser, db: DbSession
) -> UserMe:
    # MOCK KYC — a real deployment verifies via Persona/Veriff/Checkr (docs/SECURITY.md §4.2).
    # Here we simply trust the input so the rider-screening gate can be exercised end-to-end.
    user.driver_license_number = data.driver_license_number
    if data.date_of_birth is not None:
        user.date_of_birth = data.date_of_birth
    user.id_verified = True
    user.license_verified = True
    await db.commit()
    await db.refresh(user)
    return UserMe.model_validate(user)
