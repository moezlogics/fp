"""
Foodies Pakistan — FastAPI Microservice Configuration
Environment configuration for fastapi.foodiespakistan.pk
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application-wide settings loaded from environment variables."""

    # ── Service ──
    PORT: int = int(os.getenv("PORT", "8500"))
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = ENV != "production"

    # ── Security (shared with Node.js backend) ──
    VR_TOUR_SECRET: str = os.getenv("VR_TOUR_SECRET", "")
    INTERNAL_SECRET: str = os.getenv("INTERNAL_SECRET", "")

    # ── CORS ──
    ALLOWED_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:4000",
        ).split(",")
    ]

    # ── CDN ──
    CDN_BASE_URL: str = os.getenv("CDN_BASE_URL", "http://localhost:3001")
    CDN_API_KEY: str = os.getenv("CDN_API_KEY", "")

    # ── Node.js API (for saving tour data to MongoDB) ──
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:4000")

    # ── VR Tour Limits ──
    MAX_SESSIONS_PER_HOUR: int = int(os.getenv("MAX_SESSIONS_PER_HOUR", "5"))
    MAX_FRAMES_PER_SESSION: int = int(os.getenv("MAX_FRAMES_PER_SESSION", "40"))
    MAX_SCENES_PER_RESTAURANT: int = int(os.getenv("MAX_SCENES_PER_RESTAURANT", "20"))
    CAPTURE_TOKEN_EXPIRY_MINUTES: int = int(os.getenv("CAPTURE_TOKEN_EXPIRY_MINUTES", "20"))

    # ── File Limits ──
    MAX_FRAME_SIZE_MB: int = int(os.getenv("MAX_FRAME_SIZE_MB", "8"))
    PANORAMA_QUALITY: int = int(os.getenv("PANORAMA_QUALITY", "88"))
    THUMBNAIL_WIDTH: int = int(os.getenv("THUMBNAIL_WIDTH", "640"))

    def validate(self) -> None:
        """Fail-fast validation on startup."""
        if self.ENV == "production":
            if not self.VR_TOUR_SECRET or len(self.VR_TOUR_SECRET) < 16:
                raise ValueError("VR_TOUR_SECRET must be set (16+ chars) in production")
            if not self.INTERNAL_SECRET or len(self.INTERNAL_SECRET) < 16:
                raise ValueError("INTERNAL_SECRET must be set in production")
            if not self.CDN_API_KEY:
                raise ValueError("CDN_API_KEY must be set in production")


settings = Settings()
