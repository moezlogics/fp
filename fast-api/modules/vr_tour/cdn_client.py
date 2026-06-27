"""
CDN Upload Client — Uploads processed panoramas to the Foodies Pakistan CDN.

Mirrors the Node.js cdn-client.ts behavior:
- POST /api/media/upload with x-cdn-key header
- Uploads panorama + thumbnail as multipart/form-data
- Returns CDN URLs for the uploaded files
"""

import logging
from pathlib import Path

import httpx

from config import settings

logger = logging.getLogger("vr_tour.cdn")


class CdnClient:
    """Async HTTP client for CDN uploads."""

    def __init__(self):
        self.base_url = settings.CDN_BASE_URL.rstrip("/")
        self.api_key = settings.CDN_API_KEY
        self.timeout = 120.0  # 2 min — panoramas can be large

    async def upload_image(
        self,
        file_path: str,
        filename: str,
        slug: str,
    ) -> dict:
        """
        Upload an image file to the CDN.

        Args:
            file_path: Path to the local image file
            filename: Name for the uploaded file
            slug: SEO-friendly slug for the output path

        Returns:
            Dict with 'url', 'thumbUrl', 'filename', 'width', 'height', 'sizeBytes'
        """
        url = f"{self.base_url}/api/media/upload"

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                headers={"x-cdn-key": self.api_key},
                files={"image": (filename, file_bytes, "image/webp")},
                data={"slug": slug},
            )

            if response.status_code != 200:
                logger.error(f"CDN upload failed: {response.status_code} — {response.text}")
                raise Exception(f"CDN upload failed with status {response.status_code}")

            data = response.json()
            if not data.get("success"):
                raise Exception(data.get("error", "CDN upload returned error"))

            logger.info(f"CDN upload success: {data['data']['url']}")
            return data["data"]

    async def health_check(self) -> bool:
        """Check CDN connectivity."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(
                    f"{self.base_url}/health",
                    headers={"x-cdn-key": self.api_key},
                )
                return r.json().get("status") == "ok"
        except Exception:
            return False


cdn_client = CdnClient()
