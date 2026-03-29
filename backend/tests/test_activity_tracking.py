from __future__ import annotations

from collections.abc import Generator
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, joinedload, sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.config import get_settings
from app.db import get_db
from app.models import ActivityEvent, Base, Group, GroupMembership, User
from app.security import hash_password
from app.services.activity import (
    EVENT_AUTH_LOGIN_SUCCEEDED,
    EVENT_GROUP_CREATED,
    EVENT_GROUP_MEMBER_ADDED,
    EVENT_TRACK_SHARED,
    log_activity_event,
    serialize_activity_event,
)
from app.services.metadata import MetadataResolutionResult, ResolvedTrack, TrackSource


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def test_log_activity_event_persists_and_serializes_snapshots() -> None:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        owner = User(
            email="alex@example.com",
            username="alex",
            display_name="Alex Rivera",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        db.add(owner)
        db.flush()

        group = Group(name="Night Drive", owner_id=owner.id)
        db.add(group)
        db.flush()

        event = log_activity_event(
            db,
            event_type=EVENT_GROUP_CREATED,
            actor_user_id=owner.id,
            group_id=group.id,
            details={
                "actor_username": owner.username,
                "group_name": group.name,
            },
        )
        db.commit()

        stored_event = db.scalar(
            select(ActivityEvent)
            .where(ActivityEvent.id == event.id)
            .options(joinedload(ActivityEvent.actor))
        )
        assert stored_event is not None

        summary = serialize_activity_event(stored_event)

    assert summary.event_type == EVENT_GROUP_CREATED
    assert summary.title == "@alex created Night Drive"
    assert summary.detail is None


def test_login_and_group_activity_endpoints_persist_tracking(monkeypatch) -> None:
    monkeypatch.setenv("TUNETRIBE_RUN_STARTUP_TASKS_ON_APP_START", "false")
    monkeypatch.setenv("TUNETRIBE_ALLOWED_HOSTS", "testserver,localhost,127.0.0.1")
    get_settings.cache_clear()

    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    old_time = datetime.now(timezone.utc) - timedelta(days=7)
    with Session(engine) as db:
        owner = User(
            email="alex@example.com",
            username="alex",
            display_name="Alex Rivera",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        friend = User(
            email="maya@example.com",
            username="maya",
            display_name="Maya Chen",
            bio="",
            favorite_genre=None,
            favorite_artist=None,
            avatar_url=None,
            password_hash=hash_password("TuneTribe!123"),
        )
        db.add_all([owner, friend])
        db.flush()

        group = Group(name="The Heavy Rotation", owner_id=owner.id, updated_at=old_time)
        db.add(group)
        db.flush()
        db.add(GroupMembership(group_id=group.id, user_id=owner.id, role="owner"))
        db.commit()

        owner_id = owner.id
        friend_id = friend.id
        group_id = group.id

    def override_get_db() -> Generator[Session, None, None]:
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    async def fake_resolve_track_with_details(url: str, db: Session | None = None) -> MetadataResolutionResult:
        return MetadataResolutionResult(
            track=ResolvedTrack(
                source=TrackSource.SPOTIFY,
                source_url=url,
                source_identifier="abc123",
                title="Midnight City",
                artist="M83",
                album="Hurry Up, We're Dreaming",
                genre="Electronic",
                album_art_url="https://cdn.example.com/midnight-city.jpg",
                duration_ms=244000,
            ),
            resolution_source="cache",
            provider_name="spotify",
        )

    monkeypatch.setattr(main_module, "resolve_track_with_details", fake_resolve_track_with_details)

    app = main_module.create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        login_response = client.post(
            "/api/auth/login",
            json={"identifier": "alex", "password": "TuneTribe!123"},
        )
        assert login_response.status_code == 200
        login_payload = login_response.json()
        assert login_payload["user"]["loginCount"] == 1
        assert login_payload["user"]["lastLoginAt"] is not None

        headers = {"Authorization": f"Bearer {login_payload['accessToken']}"}

        add_member_response = client.post(
            f"/api/groups/{group_id}/members",
            json={"memberIds": [friend_id]},
            headers=headers,
        )
        assert add_member_response.status_code == 200

        groups_response = client.get("/api/groups", headers=headers)
        assert groups_response.status_code == 200
        assert groups_response.json()[0]["lastActiveAt"] is not None
        assert groups_response.json()[0]["lastActiveAt"] != old_time.isoformat()

        add_track_response = client.post(
            f"/api/groups/{group_id}/tracks",
            json={"url": "https://open.spotify.com/track/abc123"},
            headers=headers,
        )
        assert add_track_response.status_code == 201

        activity_response = client.get(f"/api/groups/{group_id}/activity", headers=headers)
        assert activity_response.status_code == 200
        activity_payload = activity_response.json()
        assert [event["eventType"] for event in activity_payload[:2]] == [
            EVENT_TRACK_SHARED,
            EVENT_GROUP_MEMBER_ADDED,
        ]

    with session_local() as db:
        owner = db.scalar(select(User).where(User.id == owner_id))
        assert owner is not None
        assert owner.login_count == 1
        assert owner.last_login_at is not None

        group = db.scalar(select(Group).where(Group.id == group_id))
        assert group is not None
        assert _ensure_aware(group.updated_at) > old_time

        event_types = db.scalars(
            select(ActivityEvent.event_type).order_by(ActivityEvent.occurred_at.asc())
        ).all()

    assert EVENT_AUTH_LOGIN_SUCCEEDED in event_types
    assert EVENT_GROUP_MEMBER_ADDED in event_types
    assert EVENT_TRACK_SHARED in event_types
