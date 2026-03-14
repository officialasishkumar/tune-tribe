from app.config import get_settings
from app.db import SessionLocal, init_db
from app.services.seed import seed_database


def run_startup_tasks() -> None:
    settings = get_settings()
    init_db()
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed_database(db)


def main() -> None:
    run_startup_tasks()


if __name__ == "__main__":
    main()
