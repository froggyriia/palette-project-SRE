import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("METRICS_PORT", "0")

import time

from fastapi.testclient import TestClient
from prometheus_client import REGISTRY

from app.config import settings
from app.main import app


def _count(status):
    return REGISTRY.get_sample_value(
        "http_requests_total", {"handler": "/openapi.json", "method": "GET", "status": status}
    ) or 0.0


def test_no_faults_by_default():
    assert settings.FAULT_ERROR_RATE == 0.0
    assert settings.FAULT_DELAY_MS == 0


def test_error_injection_is_counted_as_5xx(monkeypatch):
    monkeypatch.setattr(settings, "FAULT_ERROR_RATE", 1.0)
    client = TestClient(app)
    before = _count("500")
    assert client.get("/openapi.json").status_code == 500
    assert _count("500") == before + 1
    # /health is excluded so liveness probes keep working
    assert client.get("/health").status_code == 200


def test_delay_injection(monkeypatch):
    monkeypatch.setattr(settings, "FAULT_DELAY_MS", 300)
    client = TestClient(app)
    start = time.perf_counter()
    assert client.get("/openapi.json").status_code == 200
    assert time.perf_counter() - start >= 0.3
