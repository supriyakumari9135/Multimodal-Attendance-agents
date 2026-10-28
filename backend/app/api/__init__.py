from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.courses import router as courses_router
from app.api.students import router as students_router
from app.api.sessions import router as sessions_router
from app.api.processing import router as processing_router
from app.api.analytics import router as analytics_router
from app.api.reports import router as reports_router
from app.api.privacy import router as privacy_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(courses_router)
api_router.include_router(students_router)
api_router.include_router(sessions_router)
api_router.include_router(processing_router)
api_router.include_router(analytics_router)
api_router.include_router(reports_router)
api_router.include_router(privacy_router)
