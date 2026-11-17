"""Probes and the /version endpoint used by the deployment strategies."""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["METRICS_PORT"] = "0"
os.environ["APP_VERSION"] = "v9.9.9"

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.config import settings


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(settings, "APP_VERSION", "v9.9.9")
    with TestClient(main.app) as c:
        yield c


def test_live_does_not_need_database(client, monkeypatch):
    monkeypatch.setattr(main, "engine", _BrokenEngine())
    assert client.get("/live").status_code == 200


def test_ready_ok_when_database_reachable(client):
    resp = client.get("/ready")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ready_503_when_database_down(client, monkeypatch):
    monkeypatch.setattr(main, "engine", _BrokenEngine())
    assert client.get("/ready").status_code == 503


def test_version_reports_release_and_pod(client):
    resp = client.get("/version")
    assert resp.status_code == 200
    assert resp.json() == {"version": "v9.9.9", "pod": main.POD_NAME}
    assert resp.headers["X-App-Version"] == "v9.9.9"


class _BrokenEngine:
    def connect(self):
        raise ConnectionError("database is down")

    def dispose(self):
        pass
