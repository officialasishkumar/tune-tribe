from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="TUNETRIBE_",
        extra="ignore",
    )

    app_name: str = "TuneTribe API"
    database_url: str = "sqlite:///./tunetribe.db"
    secret_key: str = "change-this-secret-key-before-production-please"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:8080", "http://127.0.0.1:8080"]
    )
    allowed_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1", "tunetribe.local"])
    seed_demo_data: bool = True

    @field_validator("cors_origins", "allowed_hosts", mode="before")
    @classmethod
    def split_comma_separated_values(cls, value: Any) -> Any:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
