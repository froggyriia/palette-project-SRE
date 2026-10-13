"""
Structured JSON logging (12-factor: Logs — one event per line on stdout).

Every record becomes a single JSON object, so a log shipper (Vector) can
forward it to Victoria Logs without regex parsing, and every key becomes a
searchable field.
"""

import json
import logging
import sys
from datetime import datetime, timezone

SERVICE_NAME = "palette-backend"

# Attributes every LogRecord has by default. Anything else on a record came
# from `extra=...` and is written to the JSON as an additional field.
_STANDARD_ATTRS = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime", "taskName"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "service.name": SERVICE_NAME,
            "logger": record.name,
        }
        for key, value in record.__dict__.items():
            if key not in _STANDARD_ATTRS:
                entry[key] = value
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    # uvicorn installs its own text handlers; route its logs through ours.
    for name in ("uvicorn", "uvicorn.error"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True
    # Access log is replaced by the request middleware in main.py.
    logging.getLogger("uvicorn.access").disabled = True
