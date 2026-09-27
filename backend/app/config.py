from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    All configuration comes from environment variables (12-factor: Config).
    Never hardcode connection strings, secrets, or ports in the code itself —
    they're injected at deploy time via .env / the environment.
    """

    ENV: str = "development"
    DATABASE_URL: str = "postgresql://palette_user:palette_pass@db:5432/palette_db"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    PORT: int = 8000
    # Comma-separated list of origins the frontend is served from. The Vite
    # dev server defaults to :5173; add the production frontend URL here
    # via .env once it's deployed (Этап 7).
    CORS_ORIGINS: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
