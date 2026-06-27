"""
Foodies Pakistan — FastAPI Microservice
========================================

General-purpose Python backend at fastapi.foodiespakistan.pk
Currently hosts: VR Tour module

Start:
    uvicorn main:app --host 0.0.0.0 --port 8500 --reload

Production:
    # Single worker REQUIRED — capture session state + frames are held in memory
    # on the receiving worker (see deploy-instructions.md). Scaling out needs
    # Redis-backed sessions + shared frame storage first.
    uvicorn main:app --host 0.0.0.0 --port 8500 --workers 1
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config import settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("foodies-fastapi")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # ── Startup ──
    logger.info("=" * 50)
    logger.info("🚀 Foodies Pakistan FastAPI Microservice")
    logger.info(f"   Environment: {settings.ENV}")
    logger.info(f"   Port: {settings.PORT}")
    logger.info(f"   CDN: {settings.CDN_BASE_URL}")
    logger.info(f"   API: {settings.API_BASE_URL}")
    logger.info("=" * 50)

    if settings.ENV == "production":
        settings.validate()

    # Health check CDN
    from modules.vr_tour.cdn_client import cdn_client
    cdn_ok = await cdn_client.health_check()
    logger.info(f"   CDN Health: {'✅ OK' if cdn_ok else '⚠️  Unreachable'}")

    yield

    # ── Shutdown ──
    logger.info("👋 Shutting down...")


# ══════════════════════════════════════════════════════════════
# APP INSTANCE
# ══════════════════════════════════════════════════════════════

app = FastAPI(
    title="Foodies Pakistan — FastAPI Microservice",
    description="General-purpose Python backend. Modules: VR Tour",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)


# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── Static Files ──
app.mount("/static", StaticFiles(directory="static"), name="static")


# ── Health Check ──
@app.get("/health")
async def health():
    return {"status": "ok", "service": "foodies-fastapi", "env": settings.ENV}


# ══════════════════════════════════════════════════════════════
# MODULE REGISTRATION — Add new modules here
# ══════════════════════════════════════════════════════════════

# VR Tour Module
from modules.vr_tour.routes import router as vr_tour_router
app.include_router(vr_tour_router)

# Future modules:
# from modules.ai_analytics.routes import router as analytics_router
# app.include_router(analytics_router)


# ── Global Exception Handler ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
