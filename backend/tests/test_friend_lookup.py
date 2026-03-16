from __future__ import annotations

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.config import get_settings
from app.db import get_db
from app.models import Base, Friendship, User
from app.security import create_access_token, hash_password
from app.services.rate_limit import FixedWindowRateLimiter


def _build_client() -> tuple[TestClient, sessionmaker[Session], int]:
    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    with Session(engine) as db:
        current_user = User(
            email="alex@example.com",
            username="alex",
            display_name="Alex Rivera",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        exact_match = User(
            email="bob@example.com",
            username="bob_smith",
            display_name="Bob Smith",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        similar_user = User(
            email="bobby@example.com",
            username="bobby",
            display_name="Bobby Tables",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        pending_user = User(
            email="casey@example.com",
            username="casey",
            display_name="Casey Jones",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        db.add_all([current_user, exact_match, similar_user, pending_user])
        db.flush()
        db.add(Friendship(user_id=current_user.id, friend_id=pending_user.id, status="pending"))
        db.commit()
        current_user_id = current_user.id

    def override_get_db() -> Generator[Session, None, None]:
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app = main_module.create_app()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), session_local, current_user_id


def _auth_headers(user_id: int) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user_id))}"}


def test_friend_lookup_requires_exact_username_and_normalizes_at_prefix(monkeypatch) -> None:
    monkeypatch.setenv("TUNETRIBE_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TUNETRIBE_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    get_settings.cache_clear()

    client, _, current_user_id = _build_client()
    headers = _auth_headers(current_user_id)

    exact_response = client.get("/api/friends/lookup", params={"username": " @Bob_Smith "}, headers=headers)
    missing_response = client.get("/api/friends/lookup", params={"username": "bob"}, headers=headers)

    assert exact_response.status_code == 200
    assert exact_response.json() == {
        "user": {
            "id": 2,
            "username": "bob_smith",
            "displayName": "Bob Smith",
            "avatarUrl": None,
            "isFriend": False,
            "friendshipStatus": "none",
        }
    }

    assert missing_response.status_code == 200
    assert missing_response.json() == {"user": None}


def test_friend_lookup_returns_friendship_status(monkeypatch) -> None:
    monkeypatch.setenv("TUNETRIBE_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TUNETRIBE_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    get_settings.cache_clear()

    client, _, current_user_id = _build_client()
    headers = _auth_headers(current_user_id)

    response = client.get("/api/friends/lookup", params={"username": "casey"}, headers=headers)

    assert response.status_code == 200
    assert response.json()["user"]["friendshipStatus"] == "pending_outgoing"


def test_friend_lookup_is_rate_limited(monkeypatch) -> None:
    monkeypatch.setenv("TUNETRIBE_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TUNETRIBE_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    get_settings.cache_clear()

    limiter = FixedWindowRateLimiter(max_attempts=2, window_seconds=300)
    monkeypatch.setattr(main_module, "get_friend_lookup_rate_limiter", lambda: limiter)

    client, _, current_user_id = _build_client()
    headers = _auth_headers(current_user_id)

    for username in ("bob_smith", "bobby"):
        response = client.get("/api/friends/lookup", params={"username": username}, headers=headers)
        assert response.status_code == 200

    blocked_response = client.get("/api/friends/lookup", params={"username": "casey"}, headers=headers)

    assert blocked_response.status_code == 429
    retry_after = int(blocked_response.headers["retry-after"])
    assert 1 <= retry_after <= 300
