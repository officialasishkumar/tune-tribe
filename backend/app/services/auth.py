from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import User


def find_user_by_identifier(db: Session, identifier: str) -> User | None:
    normalized = identifier.strip().lower()
    if not normalized:
        return None

    return db.scalar(
        select(User).where(
            or_(
                func.lower(User.email) == normalized,
                func.lower(User.username) == normalized,
            )
        )
    )
