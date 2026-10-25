"""
Synthetic prober for the palette API.

Every PROBE_INTERVAL seconds it runs the main user scenario against the
backend Service:
  1. POST /palettes/generate  -> expects 201 and a palette with colors
  2. DELETE /palettes/{id}    -> expects 204 (cleans up the probe palette)

Results are exposed on METRICS_PORT/metrics and scraped by VictoriaMetrics:
  prober_success            1 if the last probe passed, else 0
  prober_duration_seconds   duration of the last probe
  prober_probes_total       probes by result (success / failure)
"""

import json
import logging
import os
import sys
import time
import urllib.error
import urllib.request

from prometheus_client import Counter, Gauge, start_http_server

TARGET_URL = os.getenv("TARGET_URL", "http://backend:8000").rstrip("/")
INTERVAL = float(os.getenv("PROBE_INTERVAL", "10"))
TIMEOUT = float(os.getenv("PROBE_TIMEOUT", "3"))
METRICS_PORT = int(os.getenv("METRICS_PORT", "9100"))

SUCCESS = Gauge("prober_success", "1 if the last probe of the generate scenario passed, else 0")
DURATION = Gauge("prober_duration_seconds", "Duration of the last probe in seconds")
PROBES = Counter("prober_probes", "Probes by result", ["result"])

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(message)s")
log = logging.getLogger("prober")


def _request(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        TARGET_URL + path, data=data, method=method,
        headers={"Content-Type": "application/json", "User-Agent": "palette-prober"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def probe_once():
    """Run the scenario once. Returns (ok, reason)."""
    status, raw = _request("POST", "/palettes/generate", {"base_color": "#3366ff", "scheme": "triadic"})
    if status != 201:
        return False, f"generate returned {status}"
    palette = json.loads(raw)
    if len(palette.get("colors", [])) != 3:
        return False, "generate returned wrong number of colors"
    status, _ = _request("DELETE", f"/palettes/{palette['id']}")
    if status != 204:
        return False, f"delete returned {status}"
    return True, "ok"


def main():
    start_http_server(METRICS_PORT)
    log.info(json.dumps({"message": "prober started", "target": TARGET_URL, "interval": INTERVAL}))
    while True:
        started = time.perf_counter()
        try:
            ok, reason = probe_once()
        except Exception as exc:  # timeouts, connection refused, bad JSON
            ok, reason = False, f"{type(exc).__name__}: {exc}"
        duration = time.perf_counter() - started

        SUCCESS.set(1 if ok else 0)
        DURATION.set(duration)
        PROBES.labels(result="success" if ok else "failure").inc()
        log.info(json.dumps({
            "level": "info" if ok else "warning", "message": "probe", "success": ok,
            "reason": reason, "duration_ms": round(duration * 1000, 1),
            "service.name": "palette-prober",
        }))
        time.sleep(max(0.0, INTERVAL - duration))


if __name__ == "__main__":
    main()
