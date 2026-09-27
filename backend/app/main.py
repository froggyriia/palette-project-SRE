from fastapi import FastAPI

from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.palettes import router as palettes_router
from app.routers.colors import palette_colors_router, colors_router

app = FastAPI(title="Palette App API")

app.include_router(auth_router)
app.include_router(palettes_router)
app.include_router(palette_colors_router)
app.include_router(colors_router)


@app.get("/health")
def health():
    """Basic liveness check — also confirms config is loaded from env."""
    return {
        "status": "ok",
        "env": settings.ENV,
    }
