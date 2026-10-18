"""Business metrics are incremented by the API handlers.

Runs the real routers against an in-memory SQLite database."""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["METRICS_PORT"] = "0"

import pytest
from fastapi.testclient import TestClient
from prometheus_client import REGISTRY
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine)


def _get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(engine)
    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def value(name, labels=None):
    return REGISTRY.get_sample_value(name, labels or {}) or 0.0


def test_generate_increments_counter(client):
    before = value("palette_generated_total", {"scheme": "triadic"})
    r = client.post("/palettes/generate", json={"base_color": "#3366ff", "scheme": "triadic"})
    assert r.status_code == 201
    assert value("palette_generated_total", {"scheme": "triadic"}) == before + 1


def test_save_export_delete(client):
    r = client.post("/palettes", json={"name": "p", "base_color": "#3366ff", "scheme_type": "weird", "colors": [{"hex": "#3366ff", "position": 0}]})
    assert r.status_code == 201, r.text
    assert value("palette_saved_total", {"scheme": "custom", "owner": "guest"}) >= 1
    pid = r.json()["id"]

    before = value("palette_exported_total", {"format": "css"})
    assert client.get(f"/palettes/{pid}/export?format=css").status_code == 200
    assert value("palette_exported_total", {"format": "css"}) == before + 1

    before = value("palette_deleted_total")
    assert client.delete(f"/palettes/{pid}").status_code == 204
    assert value("palette_deleted_total") == before + 1


def test_auth_counters(client):
    before_reg = value("user_registered_total")
    assert client.post("/auth/register", json={"email": "m@example.com", "password": "secret123"}).status_code == 201
    assert value("user_registered_total") == before_reg + 1

    ok = value("auth_login_total", {"result": "success"})
    bad = value("auth_login_total", {"result": "failure"})
    assert client.post("/auth/login", json={"email": "m@example.com", "password": "secret123"}).status_code == 200
    assert client.post("/auth/login", json={"email": "m@example.com", "password": "wrong"}).status_code == 401
    assert value("auth_login_total", {"result": "success"}) == ok + 1
    assert value("auth_login_total", {"result": "failure"}) == bad + 1


def test_http_and_runtime_metrics_present(client):
    client.get("/openapi.json")
    names = {m.name for m in REGISTRY.collect()}
    assert "http_requests" in names          # framework (instrumentator)
    assert "process_cpu_seconds" in names or "python_gc_objects_collected" in names  # runtime
