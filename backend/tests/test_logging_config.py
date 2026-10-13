import json
import logging

from app.logging_config import JsonFormatter


def _record(**extra):
    rec = logging.LogRecord("app", logging.WARNING, __file__, 1, "hello %s", ("world",), None)
    for k, v in extra.items():
        setattr(rec, k, v)
    return rec


def test_output_is_single_line_json_with_required_fields():
    line = JsonFormatter().format(_record())
    assert "\n" not in line
    data = json.loads(line)
    assert data["level"] == "warning"
    assert data["message"] == "hello world"
    assert data["service.name"] == "palette-backend"
    assert data["timestamp"].endswith("+00:00")


def test_extra_fields_are_included():
    data = json.loads(JsonFormatter().format(_record(path="/palettes", status=404, duration_ms=1.5)))
    assert data["path"] == "/palettes"
    assert data["status"] == 404
    assert data["duration_ms"] == 1.5


def test_exception_is_serialized():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys
        rec = logging.LogRecord("app", logging.ERROR, __file__, 1, "failed", (), sys.exc_info())
    assert "ValueError: boom" in json.loads(JsonFormatter().format(rec))["exception"]
