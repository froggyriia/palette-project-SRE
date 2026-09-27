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
    PORT: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
