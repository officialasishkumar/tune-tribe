from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.models import Base, User
from app.security import hash_password
from app.services.auth import find_user_by_identifier


def test_find_user_by_identifier_matches_email_and_username_case_insensitively() -> None:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        user = User(
            email="alex@example.com",
            username="alex_user",
            display_name="Alex Rivera",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        db.add(user)
        db.commit()

        email_match = find_user_by_identifier(db, "ALEX@example.com")
        username_match = find_user_by_identifier(db, "Alex_User")

        assert email_match is not None
        assert username_match is not None
        assert email_match.id == user.id
        assert username_match.id == user.id
