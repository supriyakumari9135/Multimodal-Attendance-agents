from typing import Optional, List
from pydantic import BaseModel

class PrivacySettingsOut(BaseModel):
    local_processing_active: bool = True
    auto_delete_raw_media: bool = True
    media_retention_hours: int = 24
    enable_audit_logging: bool = True
    total_stored_sessions: int = 0
    total_audit_logs: int = 0
    retained_media_files_count: int = 0
    storage_directory: str = ""

class PrivacySettingsUpdate(BaseModel):
    auto_delete_raw_media: Optional[bool] = None
    media_retention_hours: Optional[int] = None
    enable_audit_logging: Optional[bool] = None

class DeleteSessionDataRequest(BaseModel):
    session_id: str
    delete_media_only: bool = False
