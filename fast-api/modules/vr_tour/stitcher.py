"""
Hugin / panotools Equirectangular Stitching Engine
==================================================

Stitches the overlapping perspective photos captured by the guided phone
capture UI into a TRUE equirectangular (360°×180°, 2:1) panorama that web
360 viewers (Photo Sphere Viewer / Pannellum / Marzipano) can map onto a
sphere correctly.

WHY NOT OpenCV's Stitcher?
--------------------------
`cv2.Stitcher_PANORAMA` produces a *partial* planar/cylindrical mosaic — NOT
a full spherical equirectangular image. Feeding its output to a viewer in
"equirectangular" mode distorts the scene. The panorama community (and the
OpenCV maintainers) point to Hugin/panotools for genuine 360°×180° output.

PIPELINE (standard panotools workflow, seeded with capture gyro data):
    1. pto_gen        — create a Hugin project from the input images
    2. (seed)         — inject per-image yaw/pitch/roll from the phone gyro so
                        the optimiser is anchored even on featureless walls
    3. cpfind         — detect control points (--multirow for ring captures)
    4. cpclean        — prune bad control points
    5. linefind       — find vertical lines to level the horizon
    6. autooptimiser  — optimise positions + photometric exposure
    7. pano_modify    — force EQUIRECTANGULAR projection, 360×180 FOV, auto canvas
    8. nona           — remap every image into equirectangular layers
    9. enblend        — multi-band blend the layers into the final panorama

Requires Hugin to be installed on the host (provides all the binaries above).
See deploy-instructions.md.
"""

import logging
import math
import os
import re
import shutil
import subprocess
import uuid
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("vr_tour.stitcher")


# Hugin binaries the pipeline depends on.
REQUIRED_BINARIES = [
    "pto_gen",
    "cpfind",
    "cpclean",
    "autooptimiser",
    "pano_modify",
    "nona",
    "enblend",
]


class StitchingError(Exception):
    """Raised when panorama stitching fails. Carries a user-friendly message."""

    def __init__(self, message: str, code: str = "stitch_failed"):
        self.code = code
        super().__init__(message)


class HuginPanoramaStitcher:
    """
    Stitches perspective photos into an equirectangular panorama using Hugin.

    Usage:
        stitcher = HuginPanoramaStitcher()
        result = stitcher.stitch(image_paths, output_dir, orientations=[...])
    """

    # Per-image command timeouts (seconds) — generous; indoor sets can be slow.
    TIMEOUTS = {
        "pto_gen": 120,
        "cpfind": 600,
        "cpclean": 120,
        "linefind": 120,
        "autooptimiser": 600,
        "pano_modify": 120,
        "nona": 600,
        "enblend": 900,
    }

    # Seed HFOV (degrees) for a typical phone main camera, overridable via env.
    # autooptimiser refines this from control points (we optimise 'v').
    DEFAULT_HFOV = float(os.getenv("CAPTURE_HFOV", "68"))

    # Output equirectangular canvas width (height = width / 2). 2:1 enforced.
    OUTPUT_WIDTH = int(os.getenv("PANORAMA_WIDTH", "6000"))

    def __init__(self) -> None:
        self._checked = False

    # ── Dependency check ──────────────────────────────────────────────
    def _ensure_hugin(self) -> None:
        if self._checked:
            return
        missing = [b for b in REQUIRED_BINARIES if shutil.which(b) is None]
        if missing:
            raise StitchingError(
                "Panorama engine is not configured on the server "
                f"(missing: {', '.join(missing)}). Install Hugin.",
                code="hugin_missing",
            )
        self._checked = True

    # ── subprocess helper ─────────────────────────────────────────────
    def _run(self, args: list[str], cwd: str, name: str) -> subprocess.CompletedProcess:
        logger.info("[stitch] %s: %s", name, " ".join(args))
        try:
            proc = subprocess.run(
                args,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=self.TIMEOUTS.get(name, 300),
            )
        except subprocess.TimeoutExpired:
            raise StitchingError(
                f"Panorama step '{name}' timed out. Try fewer / smaller frames.",
                code="timeout",
            )
        if proc.returncode != 0:
            tail = (proc.stderr or proc.stdout or "").strip()[-500:]
            logger.error("[stitch] %s failed (%s): %s", name, proc.returncode, tail)
            raise StitchingError(
                f"Panorama step '{name}' failed. {self._friendly(name)}",
                code=f"{name}_failed",
            )
        return proc

    @staticmethod
    def _friendly(step: str) -> str:
        if step == "cpfind":
            return "Not enough overlap between photos — recapture with more overlap and steady pans."
        if step in ("autooptimiser", "cpclean"):
            return "Could not align the photos. Recapture from the centre of the room with steady movement."
        if step in ("nona", "enblend"):
            return "Could not blend the final panorama. Please recapture."
        return "Please recapture and try again."

    # ── .pto seeding with gyro orientation ────────────────────────────
    def _seed_orientation(
        self, pto_path: str, image_paths: list[str], orientations: Optional[list[dict]]
    ) -> None:
        """
        Rewrite each image ('i') line in the Hugin project to seed yaw (y),
        pitch (p), roll (r) and HFOV (v) from the capture gyro data. This
        anchors the optimiser so it still converges on featureless interiors
        where control points are sparse.
        """
        if not orientations:
            # Still pin a sane HFOV so optimisation starts from a good guess.
            orientations = [{} for _ in image_paths]

        # Map basename -> (yaw, pitch) from capture metadata.
        by_name: dict[str, dict] = {}
        for o in orientations:
            p = o.get("path") or o.get("name")
            if p:
                by_name[os.path.basename(p)] = o

        with open(pto_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        out: list[str] = []
        for line in lines:
            if line.startswith("i ") and 'n"' in line:
                m = re.search(r'n"([^"]+)"', line)
                fname = os.path.basename(m.group(1)) if m else ""
                o = by_name.get(fname, {})
                yaw = float(o.get("yaw", 0.0))
                pitch = float(o.get("pitch", 0.0))
                # Capture convention: yaw 0..360 (compass-relative), pitch +up.
                # Hugin: y left-right, p up-down. Normalise yaw to -180..180.
                y = ((yaw + 180.0) % 360.0) - 180.0
                p = max(-90.0, min(90.0, pitch))
                line = self._set_pto_param(line, "y", y)
                line = self._set_pto_param(line, "p", p)
                line = self._set_pto_param(line, "r", 0.0)
                line = self._set_pto_param(line, "v", self.DEFAULT_HFOV)
            out.append(line)

        with open(pto_path, "w", encoding="utf-8") as f:
            f.writelines(out)

    @staticmethod
    def _set_pto_param(line: str, key: str, value: float) -> str:
        """Set or replace a ` <key><number>` token on a Hugin 'i' line."""
        token = f"{key}{value:.4f}"
        pattern = rf"(?<![A-Za-z]){key}-?\d+(?:\.\d+)?"
        if re.search(pattern, line):
            return re.sub(pattern, token, line, count=1)
        # Insert before the trailing n"..." filename token.
        return re.sub(r'(\s+n")', f" {token}\\1", line, count=1)

    # ── main entry ────────────────────────────────────────────────────
    def stitch(
        self,
        image_paths: list[str],
        output_dir: str,
        orientations: Optional[list[dict]] = None,
        quality: int = 88,
    ) -> Optional[dict]:
        """
        Stitch perspective photos into an equirectangular panorama.

        Args:
            image_paths: input photo paths, in capture order.
            output_dir:  where to write the panorama + thumbnail.
            orientations: optional list of {path|name, yaw, pitch} to seed Hugin.
            quality: WebP quality (0-100) for the output.

        Returns:
            { panorama_path, thumbnail_path, width, height } or raises StitchingError.
        """
        self._ensure_hugin()

        if len(image_paths) < 6:
            raise StitchingError(
                "Need at least 6 photos to build a 360° panorama.", code="too_few"
            )

        work = os.path.join(output_dir, f"hugin_{uuid.uuid4().hex[:8]}")
        os.makedirs(work, exist_ok=True)

        # Hugin prefers consistent local filenames in the project dir.
        local_imgs: list[str] = []
        for idx, src in enumerate(image_paths):
            if not os.path.exists(src):
                continue
            dst = os.path.join(work, f"img_{idx:03d}.jpg")
            shutil.copyfile(src, dst)
            local_imgs.append(os.path.basename(dst))

        if len(local_imgs) < 6:
            raise StitchingError("Not enough valid photos.", code="too_few")

        pto = "project.pto"
        try:
            # 1. Create project (seed lens FOV so featureless sets still optimise)
            self._run(
                ["pto_gen", "--fov", str(int(self.DEFAULT_HFOV)), "-o", pto, *local_imgs],
                work, "pto_gen",
            )

            # 2. Seed per-image yaw/pitch/roll from the capture gyro
            self._seed_orientation(os.path.join(work, pto), local_imgs, orientations)

            # 3. Control points (multirow handles the ring capture pattern)
            self._run(["cpfind", "--multirow", "-o", pto, pto], work, "cpfind")

            # 4. Prune bad control points
            self._run(["cpclean", "-o", pto, pto], work, "cpclean")

            # 5. Level the horizon using detected vertical lines (best-effort)
            try:
                self._run(["linefind", "-o", pto, pto], work, "linefind")
            except StitchingError:
                logger.warning("[stitch] linefind skipped (no vertical lines)")

            # 6. Optimise geometry + photometric exposure/vignetting
            self._run(
                ["autooptimiser", "-a", "-m", "-l", "-s", "-o", pto, pto],
                work, "autooptimiser",
            )

            # 7. Force EQUIRECTANGULAR (projection 2), full 360×180, auto canvas/crop
            self._run(
                [
                    "pano_modify",
                    "--projection=2",
                    "--fov=360x180",
                    f"--canvas={self.OUTPUT_WIDTH}x{self.OUTPUT_WIDTH // 2}",
                    "--crop=AUTO",
                    "-o", pto, pto,
                ],
                work, "pano_modify",
            )

            # 8. Remap each image into equirectangular layers
            self._run(["nona", "-m", "TIFF_m", "-o", "remap", pto], work, "nona")

            layers = sorted(
                f for f in os.listdir(work) if f.startswith("remap") and f.endswith(".tif")
            )
            if not layers:
                raise StitchingError("Remapping produced no layers.", code="nona_failed")

            # 9. Blend the layers into the final equirectangular panorama
            self._run(["enblend", "-o", "panorama.tif", *layers], work, "enblend")

            pano_tif = os.path.join(work, "panorama.tif")
            if not os.path.exists(pano_tif):
                raise StitchingError("Blending produced no panorama.", code="enblend_failed")

            return self._finalize(pano_tif, output_dir, quality)

        finally:
            shutil.rmtree(work, ignore_errors=True)

    # ── post-processing: TIFF → WebP + thumbnail, enforce 2:1 ─────────
    def _finalize(self, pano_tif: str, output_dir: str, quality: int) -> dict:
        img = cv2.imread(pano_tif, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise StitchingError("Could not read blended panorama.", code="read_failed")

        # Flatten alpha (transparent poles → black caps) to 3-channel BGR.
        if img.ndim == 3 and img.shape[2] == 4:
            bgr = img[:, :, :3]
            alpha = img[:, :, 3:4].astype(np.float32) / 255.0
            img = (bgr.astype(np.float32) * alpha).astype(np.uint8)
        elif img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

        h, w = img.shape[:2]
        # Viewers REQUIRE a 2:1 equirectangular canvas — pad/letterbox if needed.
        target_w = w
        target_h = w // 2
        if h != target_h:
            canvas = np.zeros((target_h, target_w, 3), dtype=np.uint8)
            y0 = max(0, (target_h - h) // 2)
            crop_h = min(h, target_h)
            src_y0 = max(0, (h - target_h) // 2)
            canvas[y0:y0 + crop_h, :, :] = img[src_y0:src_y0 + crop_h, :, :]
            img = canvas
            h, w = img.shape[:2]

        pano_name = f"pano_{uuid.uuid4().hex[:12]}.webp"
        pano_path = os.path.join(output_dir, pano_name)
        cv2.imwrite(pano_path, img, [cv2.IMWRITE_WEBP_QUALITY, quality])
        logger.info("[stitch] equirectangular saved: %s (%dx%d)", pano_path, w, h)

        thumb_w = int(os.getenv("THUMBNAIL_WIDTH", "640"))
        thumb_h = thumb_w // 2
        thumb = cv2.resize(img, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
        thumb_name = f"thumb_{uuid.uuid4().hex[:12]}.webp"
        thumb_path = os.path.join(output_dir, thumb_name)
        cv2.imwrite(thumb_path, thumb, [cv2.IMWRITE_WEBP_QUALITY, 60])

        return {
            "panorama_path": pano_path,
            "thumbnail_path": thumb_path,
            "width": w,
            "height": h,
        }


# Singleton (keeps the old import name working)
panorama_stitcher = HuginPanoramaStitcher()
PanoramaStitcher = HuginPanoramaStitcher  # backwards-compatible alias
