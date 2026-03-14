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


def test_production_settings_require_non_sqlite_database() -> None:
    with pytest.raises(ValidationError, match="must use MySQL"):
        Settings(
            environment="production",
            database_url="sqlite:///./tunetribe.db",
            secret_key="super-secret",
            seed_demo_data=False,
        )


def test_production_settings_require_demo_seeding_to_be_disabled() -> None:
    with pytest.raises(ValidationError, match="disable demo data seeding"):
        Settings(
            environment="production",
            database_url="mysql+pymysql://user:pass@db:3306/tunetribe",
            secret_key="super-secret",
            seed_demo_data=True,
        )
