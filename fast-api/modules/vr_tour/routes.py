"""
VR Tour Routes — All endpoints for the 360° Virtual Tour module.

Handles:
- Capture session verification & UI serving
- Frame upload during capture
- Stitching trigger & status polling
- Tour viewer serving (public)
- Webhook from Node.js for session creation
"""

import asyncio
import base64
import json
import logging
import os
import shutil
import tempfile
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from common.security import (
    create_capture_token,
    mark_session_used,
    verify_capture_token,
    verify_internal_secret,
)
from config import settings
from modules.vr_tour.cdn_client import cdn_client
from modules.vr_tour.stitcher import PanoramaStitcher, StitchingError, panorama_stitcher

logger = logging.getLogger("vr_tour.routes")

router = APIRouter(prefix="/vr-tour", tags=["VR Tour"])

# Template engine
templates = Jinja2Templates(directory="templates/vr_tour")


# ── In-memory session state ──
# Maps session_id → session data (frames, status, etc.)
# In production with multiple workers, use Redis
_sessions: dict[str, dict] = {}


def _get_session(session_id: str) -> dict | None:
    """Get session data, clean up expired sessions."""
    session = _sessions.get(session_id)
    if session and session.get("expires_at", 0) < time.time():
        # Expired — clean up
        _cleanup_session(session_id)
        return None
    return session


def _cleanup_session(session_id: str) -> None:
    """Remove session data and temp files."""
    session = _sessions.pop(session_id, None)
    if session and session.get("temp_dir"):
        try:
            shutil.rmtree(session["temp_dir"], ignore_errors=True)
        except Exception:
            pass


# ══════════════════════════════════════════════════════════════
# WEBHOOK — Called by Node.js to create capture sessions
# ══════════════════════════════════════════════════════════════


@router.post("/api/create-session")
async def create_session(request: Request):
    """
    Create a new capture session. Called by the Node.js backend.
    Requires x-app-internal-secret header.

    Body: { restaurantId, userId, sceneName, callbackUrl }
    Returns: { captureUrl, sessionId }
    """
    # Verify internal secret
    secret = request.headers.get("x-app-internal-secret", "")
    if not verify_internal_secret(secret):
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await request.json()
    restaurant_id = body.get("restaurantId")
    user_id = body.get("userId")
    scene_name = body.get("sceneName", "Scene")
    callback_url = body.get("callbackUrl", "")

    if not restaurant_id or not user_id:
        raise HTTPException(status_code=400, detail="restaurantId and userId required")

    # Create HMAC-signed token
    token = create_capture_token(restaurant_id, user_id, scene_name, callback_url)

    # Build capture URL
    base = request.base_url
    capture_url = f"{base}vr-tour/capture/{token}"

    return JSONResponse(
        {"success": True, "captureUrl": capture_url, "token": token}
    )


# ══════════════════════════════════════════════════════════════
# CAPTURE UI — Served to the owner's phone
# ══════════════════════════════════════════════════════════════


@router.get("/capture/{token}", response_class=HTMLResponse)
async def capture_page(request: Request, token: str):
    """
    Serve the Guided 360° Capture UI.
    The token is verified before serving — expired/invalid tokens get an error page.
    """
    payload = verify_capture_token(token)
    if not payload:
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "title": "Session Expired",
                "message": "This capture session has expired or is invalid. Please start a new session from the owner dashboard.",
            },
            status_code=403,
        )

    # Create session in memory
    session_id = payload["sid"]
    temp_dir = tempfile.mkdtemp(prefix=f"vr_{session_id[:8]}_")

    _sessions[session_id] = {
        "restaurant_id": payload["rid"],
        "user_id": payload["uid"],
        "scene_name": payload["name"],
        "callback_url": payload.get("cb", ""),
        "session_id": session_id,
        "temp_dir": temp_dir,
        "frames": [],
        "status": "capturing",  # capturing → stitching → uploading → done → failed
        "created_at": time.time(),
        "expires_at": payload["exp"],
        "result": None,
    }

    # Mark token as used (anti-replay)
    mark_session_used(session_id, payload["exp"])

    return templates.TemplateResponse(
        "capture.html",
        {
            "request": request,
            "session_id": session_id,
            "scene_name": payload["name"],
            "restaurant_id": payload["rid"],
            "max_frames": settings.MAX_FRAMES_PER_SESSION,
        },
    )


# ══════════════════════════════════════════════════════════════
# FRAME UPLOAD — Called by capture UI during photo capture
# ══════════════════════════════════════════════════════════════


@router.post("/api/upload-frame")
async def upload_frame(
    session_id: str = Form(...),
    frame_index: int = Form(...),
    yaw: float = Form(0.0),
    pitch: float = Form(0.0),
    image: UploadFile = File(...),
):
    """
    Upload a single captured frame.
    Called by the capture UI after each auto-snap.
    """
    session = _get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if session["status"] != "capturing":
        raise HTTPException(status_code=400, detail="Session is no longer capturing")
    if len(session["frames"]) >= settings.MAX_FRAMES_PER_SESSION:
        raise HTTPException(status_code=400, detail="Maximum frames reached")

    # Read image data
    content = await image.read()
    max_size = settings.MAX_FRAME_SIZE_MB * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"Frame too large. Max {settings.MAX_FRAME_SIZE_MB}MB.",
        )

    # Save to temp directory
    ext = "jpg"
    frame_path = os.path.join(
        session["temp_dir"], f"frame_{frame_index:03d}.{ext}"
    )
    with open(frame_path, "wb") as f:
        f.write(content)

    session["frames"].append(
        {
            "path": frame_path,
            "index": frame_index,
            "yaw": yaw,
            "pitch": pitch,
        }
    )

    logger.info(
        f"Session {session_id[:8]}: Frame {frame_index} saved "
        f"({len(content) / 1024:.0f}KB, yaw={yaw:.1f}, pitch={pitch:.1f})"
    )

    return JSONResponse(
        {
            "success": True,
            "frameCount": len(session["frames"]),
            "maxFrames": settings.MAX_FRAMES_PER_SESSION,
        }
    )


# ══════════════════════════════════════════════════════════════
# COMPLETE CAPTURE — Triggers stitching pipeline
# ══════════════════════════════════════════════════════════════


@router.post("/api/complete-capture")
async def complete_capture(request: Request):
    """
    Called when capture is complete. Triggers async stitching.
    """
    body = await request.json()
    session_id = body.get("sessionId")

    session = _get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if session["status"] != "capturing":
        raise HTTPException(status_code=400, detail="Session is no longer capturing")
    if len(session["frames"]) < 8:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 8 frames, got {len(session['frames'])}",
        )

    session["status"] = "stitching"
    logger.info(
        f"Session {session_id[:8]}: Starting stitch with {len(session['frames'])} frames"
    )

    # Run stitching in background
    asyncio.create_task(_process_session(session_id))

    return JSONResponse({"success": True, "status": "stitching"})


async def _process_session(session_id: str) -> None:
    """Background task: stitch → optimize → upload → notify."""
    session = _sessions.get(session_id)
    if not session:
        return

    try:
        # 1. Sort frames by index for consistent ordering
        session["frames"].sort(key=lambda f: f["index"])
        frame_paths = [f["path"] for f in session["frames"]]

        # 2. Run stitching (CPU-intensive — run in executor)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            panorama_stitcher.stitch,
            frame_paths,
            session["temp_dir"],
            settings.PANORAMA_QUALITY,
        )

        if not result:
            raise Exception("Stitching returned no result")

        session["status"] = "uploading"
        logger.info(f"Session {session_id[:8]}: Stitching complete, uploading to CDN...")

        # 3. Upload to CDN
        restaurant_id = session["restaurant_id"]
        scene_name = session["scene_name"]
        slug_name = scene_name.lower().replace(" ", "_").replace("/", "_")[:40]

        # Upload panorama
        pano_result = await cdn_client.upload_image(
            result["panorama_path"],
            f"360_{slug_name}.webp",
            f"vr-tour-{restaurant_id}",
        )

        # Upload thumbnail
        thumb_result = await cdn_client.upload_image(
            result["thumbnail_path"],
            f"thumb_360_{slug_name}.webp",
            f"vr-tour-{restaurant_id}-thumbs",
        )

        # 4. Notify Node.js backend
        scene_id = uuid.uuid4().hex
        tour_data = {
            "sceneId": scene_id,
            "name": scene_name,
            "panoramaUrl": pano_result["url"],
            "thumbnailUrl": thumb_result["url"],
            "width": result["width"],
            "height": result["height"],
        }

        import httpx

        async with httpx.AsyncClient(timeout=15.0) as client:
            save_url = f"{settings.API_BASE_URL}/api/v1/virtual-tour/{restaurant_id}/save-tour"
            resp = await client.post(
                save_url,
                json=tour_data,
                headers={
                    "x-app-internal-secret": settings.INTERNAL_SECRET,
                    "Content-Type": "application/json",
                },
            )
            if resp.status_code != 200:
                logger.error(f"Failed to save tour data: {resp.status_code} — {resp.text}")

        session["status"] = "done"
        session["result"] = {
            "panoramaUrl": pano_result["url"],
            "thumbnailUrl": thumb_result["url"],
            "sceneId": scene_id,
            "sceneName": scene_name,
        }
        logger.info(f"Session {session_id[:8]}: ✅ Complete!")

    except StitchingError as e:
        session["status"] = "failed"
        session["error"] = str(e)
        logger.error(f"Session {session_id[:8]}: Stitching error — {e}")

    except Exception as e:
        session["status"] = "failed"
        session["error"] = str(e)
        logger.error(f"Session {session_id[:8]}: Processing error — {e}")


# ══════════════════════════════════════════════════════════════
# STATUS POLLING — Called by capture/processing UI
# ══════════════════════════════════════════════════════════════


@router.get("/api/status/{session_id}")
async def get_status(session_id: str):
    """Poll stitching/upload progress."""
    session = _get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    response = {
        "status": session["status"],
        "frameCount": len(session.get("frames", [])),
    }

    if session["status"] == "done":
        response["result"] = session.get("result")
        response["callbackUrl"] = session.get("callback_url", "")

    if session["status"] == "failed":
        response["error"] = session.get("error", "Unknown error")

    return JSONResponse(response)


# ══════════════════════════════════════════════════════════════
# PROCESSING PAGE — Shows progress while stitching
# ══════════════════════════════════════════════════════════════


@router.get("/processing/{session_id}", response_class=HTMLResponse)
async def processing_page(request: Request, session_id: str):
    """Show stitching progress page."""
    session = _get_session(session_id)
    if not session:
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "title": "Session Not Found",
                "message": "This processing session was not found or has expired.",
            },
            status_code=404,
        )

    return templates.TemplateResponse(
        "processing.html",
        {
            "request": request,
            "session_id": session_id,
            "scene_name": session.get("scene_name", "Scene"),
            "frame_count": len(session.get("frames", [])),
            "callback_url": session.get("callback_url", ""),
        },
    )


# ══════════════════════════════════════════════════════════════
# VIEWER — Public 360° tour viewer
# ══════════════════════════════════════════════════════════════


@router.get("/view/{restaurant_id}", response_class=HTMLResponse)
async def viewer_page(request: Request, restaurant_id: str):
    """
    Serve the Pannellum 360° viewer for a restaurant.
    Fetches tour data from the Node.js API.
    """
    try:
        import httpx

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{settings.API_BASE_URL}/api/v1/virtual-tour/{restaurant_id}/tour-data",
                headers={"x-app-internal-secret": settings.INTERNAL_SECRET},
            )

            if resp.status_code != 200:
                return templates.TemplateResponse(
                    "error.html",
                    {
                        "request": request,
                        "title": "Tour Not Available",
                        "message": "This restaurant does not have a published 360° tour yet.",
                    },
                    status_code=404,
                )

            tour_data = resp.json()

    except Exception as e:
        logger.error(f"Failed to fetch tour data: {e}")
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "title": "Service Error",
                "message": "Could not load the tour at this time. Please try again later.",
            },
            status_code=500,
        )

    if not tour_data.get("success") or not tour_data.get("data", {}).get("scenes"):
        return templates.TemplateResponse(
            "error.html",
            {
                "request": request,
                "title": "Tour Not Available",
                "message": "This restaurant does not have a published 360° tour yet.",
            },
            status_code=404,
        )

    return templates.TemplateResponse(
        "viewer.html",
        {
            "request": request,
            "restaurant_name": tour_data["data"].get("restaurantName", "Restaurant"),
            "tour_data": json.dumps(tour_data["data"]),
        },
    )
