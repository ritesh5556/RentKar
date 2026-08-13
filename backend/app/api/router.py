"""Aggregates all versioned API routes under the /api prefix."""

from fastapi import APIRouter

from app.api.routes import auth, bikes, users

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(bikes.router)
