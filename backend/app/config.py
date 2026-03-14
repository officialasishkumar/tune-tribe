from functools import lru_cache
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_SECRET_KEY = "change-this-secret-key-before-production-please"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="TUNETRIBE_",
        extra="ignore",
    )

    app_name: str = "TuneTribe API"
    environment: Literal["development", "production", "test"] = "development"
    database_url: str = "sqlite:///./tunetribe.db"
    database_auto_migrate: bool = True
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_recycle_seconds: int = 1800
    secret_key: str = DEFAULT_SECRET_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:8080", "http://127.0.0.1:8080"]
    )
    allowed_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1", "tunetribe.local"])
    seed_demo_data: bool = True
    run_startup_tasks_on_app_start: bool = True

    @field_validator("cors_origins", "allowed_hosts", mode="before")
    @classmethod
    def split_comma_separated_values(cls, value: Any) -> Any:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment != "production":
            return self

        if self.secret_key == DEFAULT_SECRET_KEY:
            raise ValueError("TUNETRIBE_SECRET_KEY must be set to a non-default value in production.")
        if self.database_url.startswith("sqlite"):
            raise ValueError("Production deployments must use MySQL, not SQLite.")
        if self.seed_demo_data:
            raise ValueError("Production deployments must disable demo data seeding.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
