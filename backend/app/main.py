from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers.auth import router as auth_router
from app.routers.palettes import router as palettes_router
from app.routers.colors import palette_colors_router, colors_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: nothing heavy — the app should be ready to serve traffic
    # almost immediately (12-factor: Disposability — fast startup).
    yield
    # Shutdown: release the DB connection pool cleanly instead of letting
    # the process die with connections half-open. This matters once the
    # app runs behind an orchestrator that sends SIGTERM on redeploy/scale
    # down (12-factor: Disposability — graceful shutdown). Uvicorn already
    # translates SIGTERM into this shutdown event for us.
    engine.dispose()


app = FastAPI(title="Palette App API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
