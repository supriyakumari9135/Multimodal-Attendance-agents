import platform
import os
from fastapi import APIRouter
from app.schemas.common import CapabilitiesResponse
from app.core.config import settings
from app.vision.vision_engine import vision_processor
from app.audio.audio_engine import audio_processor

router = APIRouter(prefix="/health", tags=["Health & Capabilities"])

@router.get("")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "offline_mode": True,
        "device": platform.system() + " " + platform.release()
    }

@router.get("/capabilities", response_model=CapabilitiesResponse)
def get_capabilities():
    return CapabilitiesResponse(
        offline_ready=True,
        opencv_available=True,
        mediapipe_available=False,  # transparent declaration
        audio_vad_available=audio_processor.is_vad_installed,
        speech_transcription_available=False,  # optional local model not installed
        pdf_export_available=True,
        active_device=platform.node() or "Local Device",
        media_storage_path=str(settings.UPLOAD_DIR)
    )
