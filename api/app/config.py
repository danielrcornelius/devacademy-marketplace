from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/newli_marketplace"
    allowed_origins: str = "http://localhost:3000"

    # Auth
    secret_key: str = "change-me-in-production"
    resend_api_key: str = ""
    app_base_url: str = "http://localhost:3000"
    token_expire_minutes: int = 15
    jwt_expire_days: int = 7

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
