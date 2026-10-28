from typing import Optional, Any, Dict, List
from pydantic import BaseModel

class APIResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    meta: Optional[Dict[str, Any]] = None

class CapabilitiesResponse(BaseModel):
    offline_ready: bool
    opencv_available: bool
    mediapipe_available: bool
    audio_vad_available: bool
    speech_transcription_available: bool
    pdf_export_available: bool
    active_device: str
    media_storage_path: str
