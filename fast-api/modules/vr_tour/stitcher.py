"""
OpenCV Panorama Stitching Engine

Takes multiple overlapping images captured in a ring pattern and stitches
them into an equirectangular panorama using OpenCV's Stitcher class.

This is the same stitching algorithm family used by Google Street View.
"""

import os
import uuid
import tempfile
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("vr_tour.stitcher")


class StitchingError(Exception):
    """Raised when panorama stitching fails."""

    STATUS_MESSAGES = {
        1: "Not enough overlapping features between images. Try recapturing with more overlap.",
        2: "Could not estimate camera geometry. Images may be too similar or too different.",
        3: "Camera parameters could not be adjusted. Try recapturing from the center of the room.",
    }

    def __init__(self, status_code: int):
        self.status_code = status_code
        message = self.STATUS_MESSAGES.get(
            status_code, f"Unknown stitching error (code: {status_code})"
        )
        super().__init__(message)


class PanoramaStitcher:
    """
    Stitches multiple images into an equirectangular panorama.

    Usage:
        stitcher = PanoramaStitcher()
        result_path = await stitcher.stitch(image_paths, output_dir)
    """

    # Max width to resize images before stitching (performance)
    MAX_INPUT_WIDTH = 2400

    def __init__(self):
        pass

    def _load_and_prepare(self, image_paths: list[str]) -> list[np.ndarray]:
        """Load images and resize if too large for performance."""
        images = []
        for path in image_paths:
            img = cv2.imread(path)
            if img is None:
                logger.warning(f"Could not read image: {path}")
                continue

            # Resize if too wide (speeds up stitching dramatically)
            h, w = img.shape[:2]
            if w > self.MAX_INPUT_WIDTH:
                scale = self.MAX_INPUT_WIDTH / w
                new_w = int(w * scale)
                new_h = int(h * scale)
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
                logger.info(f"Resized {path}: {w}x{h} → {new_w}x{new_h}")

            images.append(img)

        return images

    def stitch(
        self,
        image_paths: list[str],
        output_dir: str,
        quality: int = 88,
    ) -> Optional[dict]:
        """
        Stitch images into a panorama.

        Args:
            image_paths: List of image file paths (in capture order)
            output_dir: Directory to save the output panorama
            quality: JPEG quality for the output (0-100)

        Returns:
            Dict with 'panorama_path' and 'thumbnail_path', or None on failure.

        Raises:
            StitchingError: If OpenCV stitching fails
        """
        logger.info(f"Starting stitch with {len(image_paths)} images")

        if len(image_paths) < 4:
            raise StitchingError(1)  # Need more images

        # Load and prepare images
        images = self._load_and_prepare(image_paths)
        if len(images) < 4:
            raise StitchingError(1)

        logger.info(f"Loaded {len(images)} images, starting OpenCV stitcher...")

        # Create stitcher in PANORAMA mode (wider field of view)
        stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)

        # Configure for best quality
        stitcher.setPanoConfidenceThresh(0.6)  # Lower threshold = more forgiving

        # Perform stitching
        status, panorama = stitcher.stitch(images)

        if status != cv2.Stitcher_OK:
            logger.error(f"Stitching failed with status: {status}")
            raise StitchingError(status)

        logger.info(
            f"Stitching successful! Output size: {panorama.shape[1]}x{panorama.shape[0]}"
        )

        # ── Post-processing ──

        # 1. Crop black borders (stitching artifacts)
        panorama = self._crop_black_borders(panorama)

        # 2. Save high-res panorama as WebP
        pano_filename = f"pano_{uuid.uuid4().hex[:12]}.webp"
        pano_path = os.path.join(output_dir, pano_filename)
        cv2.imwrite(pano_path, panorama, [cv2.IMWRITE_WEBP_QUALITY, quality])
        logger.info(f"Saved panorama: {pano_path}")

        # 3. Generate thumbnail (low-res preview for fast loading)
        thumb_filename = f"thumb_{uuid.uuid4().hex[:12]}.webp"
        thumb_path = os.path.join(output_dir, thumb_filename)
        thumb_width = 640
        h, w = panorama.shape[:2]
        thumb_height = int(h * (thumb_width / w))
        thumbnail = cv2.resize(
            panorama, (thumb_width, thumb_height), interpolation=cv2.INTER_AREA
        )
        cv2.imwrite(thumb_path, thumbnail, [cv2.IMWRITE_WEBP_QUALITY, 60])
        logger.info(f"Saved thumbnail: {thumb_path}")

        return {
            "panorama_path": pano_path,
            "thumbnail_path": thumb_path,
            "width": panorama.shape[1],
            "height": panorama.shape[0],
        }

    def _crop_black_borders(self, img: np.ndarray) -> np.ndarray:
        """Remove black borders that appear after stitching."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 5, 255, cv2.THRESH_BINARY)

        # Find contours
        contours, _ = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            return img

        # Get bounding rect of largest contour
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)

        # Only crop if the border is significant (> 2% of image)
        img_h, img_w = img.shape[:2]
        if x > img_w * 0.02 or y > img_h * 0.02:
            # Add small padding
            pad = 5
            x = max(0, x - pad)
            y = max(0, y - pad)
            w = min(img_w - x, w + 2 * pad)
            h = min(img_h - y, h + 2 * pad)
            img = img[y : y + h, x : x + w]
            logger.info(f"Cropped black borders: {img_w}x{img_h} → {w}x{h}")

        return img


# Singleton
panorama_stitcher = PanoramaStitcher()
