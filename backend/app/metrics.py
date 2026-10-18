"""
Prometheus/OpenMetrics metrics.

- Runtime metrics (process_*, python_gc_*, python_info) come from
  prometheus_client's default collectors.
- Framework metrics (http_requests_total, http_request_duration_seconds, ...)
  come from prometheus-fastapi-instrumentator.
- Business metrics of the palette domain are declared below.

Metrics are served by a separate HTTP server on METRICS_PORT (9100), which is
not part of the public Service: only in-cluster scrapers reach it.
"""

import logging
import os

from prometheus_client import Counter, start_http_server
from prometheus_fastapi_instrumentator import Instrumentator

logger = logging.getLogger("app.metrics")

METRICS_PORT = int(os.getenv("METRICS_PORT", "9100"))

# --- business metrics -------------------------------------------------------

PALETTES_GENERATED = Counter(
    "palette_generated",
    "Palettes generated from a base color, by color scheme",
    ["scheme"],
)
PALETTES_SAVED = Counter(
    "palette_saved",
    "Palettes saved via POST /palettes, by scheme and owner type",
    ["scheme", "owner"],
)
PALETTES_DELETED = Counter(
    "palette_deleted",
    "Palettes deleted",
)
PALETTES_EXPORTED = Counter(
    "palette_exported",
    "Palette exports, by format",
    ["format"],
)
LOGINS = Counter(
    "auth_login",
    "Login attempts, by result",
    ["result"],
)
REGISTRATIONS = Counter(
    "user_registered",
    "Successful user registrations",
)


def setup_metrics(app) -> None:
    """Attach HTTP instrumentation to the FastAPI app."""
    Instrumentator(
        should_group_status_codes=False,
        excluded_handlers=["/health"],
    ).instrument(app)


def start_metrics_server() -> None:
    """Start the /metrics endpoint on its own port (called once at startup)."""
    try:
        start_http_server(METRICS_PORT)
        logger.info("metrics server started", extra={"port": METRICS_PORT})
    except OSError as exc:
        # Port already taken (e.g. a second app instance in the same process
        # during tests) — the app itself must keep working.
        logger.warning("metrics server not started", extra={"port": METRICS_PORT, "error": str(exc)})
