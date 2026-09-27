from fastapi import FastAPI
from app.config import settings

app = FastAPI(title="Palette App API")


@app.get("/health")
def health():
    """Basic liveness check — also confirms config is loaded from env."""
    return {
        "status": "ok",
        "env": settings.ENV,
    }
