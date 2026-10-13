import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.logging_config import setup_logging
from app.security import decode_access_token
from app.routers.auth import router as auth_router
from app.routers.palettes import router as palettes_router
from app.routers.colors import palette_colors_router, colors_router

setup_logging()
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing heavy — the app should be ready to serve traffic
    # almost immediately (12-factor: Disposability — fast startup).
    yield
    # Shutdown: release the DB connection pool cleanly instead of letting
    # the process die with connections half-open. This matters once the
    # app runs behind an orchestrator that sends SIGTERM on redeploy/scale
    # down (12-factor: Disposability — graceful shutdown). Uvicorn already
    # translates SIGTERM into this shutdown event for us.
    engine.dispose()


app = FastAPI(title="Palette App API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """One structured log line per request: method, path, status, duration, user."""
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    user_id = None
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        user_id = decode_access_token(auth[7:])

    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.error(
            "unhandled exception",
            exc_info=True,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": 500,
                "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                "user_id": user_id,
            },
        )
        return JSONResponse({"detail": "Internal Server Error"}, status_code=500)

    # Kubernetes probes hit /health every few seconds; skip them to keep logs useful.
    if request.url.path != "/health":
        status_code = response.status_code
        level = logging.ERROR if status_code >= 500 else logging.WARNING if status_code >= 400 else logging.INFO
        logger.log(
            level,
            "request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": status_code,
                "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                "user_id": user_id,
            },
        )
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(auth_router)
app.include_router(palettes_router)
app.include_router(palette_colors_router)
app.include_router(colors_router)


@app.get("/health")
def health():
    """Basic liveness check — also confirms config is loaded from env."""
    return {
        "status": "ok",
        "env": settings.ENV,
    }
