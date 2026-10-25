"""
Fault injection for SLO demonstrations.

Controlled by environment variables (12-factor: Config):
  FAULT_ERROR_RATE  share of API requests answered with HTTP 500 (0.0–1.0)
  FAULT_DELAY_MS    extra latency added to every API request, in ms

Example: kubectl set env deployment/backend FAULT_DELAY_MS=400
/health is never affected, so Kubernetes probes keep the pods alive.
"""

import asyncio
import random

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import settings

EXCLUDED_PATHS = {"/health"}


async def fault_injection(request: Request, call_next):
    if request.url.path in EXCLUDED_PATHS:
        return await call_next(request)

    if settings.FAULT_DELAY_MS > 0:
        await asyncio.sleep(settings.FAULT_DELAY_MS / 1000)

    if settings.FAULT_ERROR_RATE > 0 and random.random() < settings.FAULT_ERROR_RATE:
        return JSONResponse({"detail": "Injected fault"}, status_code=500)

    return await call_next(request)
