from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, coaches, health, sports, student_goals
from app.routers.bookings import coaches_router as bookings_coaches_router
from app.routers.bookings import users_router as bookings_users_router

settings = get_settings()

app = FastAPI(
    title="Newli Marketplace API",
    description="Coaches and athletes finding each other — swim, tri, MTB, and beyond.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(sports.router, prefix="/sports", tags=["sports"])
app.include_router(coaches.router, prefix="/coaches", tags=["coaches"])
app.include_router(student_goals.router, prefix="/student-goals", tags=["student-goals"])
app.include_router(bookings_coaches_router, prefix="/coaches", tags=["bookings"])
app.include_router(bookings_users_router, prefix="/users", tags=["bookings"])
