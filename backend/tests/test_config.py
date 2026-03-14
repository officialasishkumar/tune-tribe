import pytest
from pydantic import ValidationError

from app.config import DEFAULT_SECRET_KEY, Settings


def test_production_settings_require_non_default_secret_key() -> None:
    with pytest.raises(ValidationError, match="non-default value"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/tunetribe",
            secret_key=DEFAULT_SECRET_KEY,
            seed_demo_data=False,
        )


def test_settings_accept_comma_separated_env_lists(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TUNETRIBE_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    monkeypatch.setenv("TUNETRIBE_CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080")

    settings = Settings()

    assert settings.allowed_hosts == ["testserver", "localhost", "127.0.0.1"]
    assert settings.cors_origins == ["http://localhost:8080", "http://127.0.0.1:8080"]


def test_production_settings_require_non_sqlite_database() -> None:
    with pytest.raises(ValidationError, match="must use MySQL"):
        Settings(
            environment="production",
            database_url="sqlite:///./tunetribe.db",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=False,
        )


def test_production_settings_require_long_secret_key() -> None:
    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/tunetribe",
            secret_key="short-secret-key",
            seed_demo_data=False,
        )


def test_production_settings_require_demo_seeding_to_be_disabled() -> None:
    with pytest.raises(ValidationError, match="disable demo data seeding"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/tunetribe",
            secret_key="this-is-a-long-enough-secret-for-production",
            seed_demo_data=True,
        )
