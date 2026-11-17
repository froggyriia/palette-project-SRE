import logging
import os
import socket
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.logging_config import setup_logging
from app.faults import fault_injection
from app.metrics import setup_metrics, start_metrics_server
from app.security import decode_access_token
from app.routers.auth import router as auth_router
from app.routers.palettes import router as palettes_router
from app.routers.colors import palette_colors_router, colors_router

setup_logging()
logger = logging.getLogger("app")

# Pod name in Kubernetes (HOSTNAME is set to it), container id in Docker.
POD_NAME = os.getenv("HOSTNAME") or socket.gethostname()
# Kubernetes probes: excluded from request logs, metrics and fault injection.
PROBE_PATHS = {"/health", "/live", "/ready"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing heavy — the app should be ready to serve traffic
    # almost immediately (12-factor: Disposability — fast startup).
    start_metrics_server()
    yield
    # Shutdown: release the DB connection pool cleanly instead of letting
    # the process die with connections half-open. This matters once the
    # app runs behind an orchestrator that sends SIGTERM on redeploy/scale
    # down (12-factor: Disposability — graceful shutdown). Uvicorn already
    # translates SIGTERM into this shutdown event for us.
    engine.dispose()


app = FastAPI(title="Palette App API", lifespan=lifespan)
# Registered before the instrumentator so that injected errors and delays
# are measured by http_requests_total / http_request_duration_*.
app.middleware("http")(fault_injection)
setup_metrics(app)

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
                "version": settings.APP_VERSION,
            },
        )
        return JSONResponse({"detail": "Internal Server Error"}, status_code=500)

    # Kubernetes probes hit /live and /ready every few seconds; skip them to keep logs useful.
    if request.url.path not in PROBE_PATHS:
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
                "version": settings.APP_VERSION,
            },
        )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-App-Version"] = settings.APP_VERSION
    return response


app.include_router(auth_router)
app.include_router(palettes_router)
app.include_router(palette_colors_router)
app.include_router(colors_router)


@app.get("/health")
def health():
    """Basic health check — also confirms config is loaded from env."""
    return {
        "status": "ok",
        "env": settings.ENV,
    }


@app.get("/live")
def live():
    """Liveness probe: the process is up and serves HTTP. Does not touch the
    database, so a database outage does not make Kubernetes restart pods."""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """Readiness probe: the pod can serve requests, i.e. the database (where
    all state lives) is reachable. While it answers 503, Kubernetes keeps the
    pod out of the Service endpoints and does not send it traffic."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        logger.warning("readiness check failed", extra={"error": str(exc)})
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {"status": "ok"}


@app.get("/version")
def version():
    """Which release and which pod answered — used to observe deployment strategies."""
    return {"version": settings.APP_VERSION, "pod": POD_NAME}
