import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
REPORTS_DIR = DATA_DIR / "reports"
MODELS_DIR = BASE_DIR / "models"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Multimodal Attendance & Engagement Agent"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Storage and paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    UPLOAD_DIR: Path = UPLOAD_DIR
    REPORTS_DIR: Path = REPORTS_DIR
    MODELS_DIR: Path = MODELS_DIR
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR}/attendance_agent.db"
    
    # Privacy & Retention
    AUTO_DELETE_RAW_MEDIA: bool = True
    MEDIA_RETENTION_HOURS: int = 24
    ENABLE_AUDIT_LOGGING: bool = True
    
    # Processing defaults
    DEFAULT_SAMPLE_INTERVAL_SECONDS: float = 1.0
    MIN_OBSERVATION_DURATION_SECONDS: float = 15.0
    PRESENCE_THRESHOLD_RATIO: float = 0.5
    
    # Configurable Engagement Weights
    WEIGHT_PARTICIPATION: float = 0.35
    WEIGHT_MOVEMENT: float = 0.25
    WEIGHT_HEAD_ORIENTATION: float = 0.20
    WEIGHT_AUDIO: float = 0.20

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
