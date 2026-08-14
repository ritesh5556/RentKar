"""Aggregates all versioned API routes under the /api prefix."""

from fastapi import APIRouter

from app.api.routes import auth, bikes, bookings, reviews, users

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(bikes.router)
api_router.include_router(bookings.router)
api_router.include_router(reviews.router)
