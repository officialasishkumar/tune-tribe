from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import ActivityEvent
from app.schemas import ActivityEventSummary


EVENT_AUTH_REGISTERED = "auth.registered"
EVENT_AUTH_LOGIN_SUCCEEDED = "auth.login_succeeded"
EVENT_PROFILE_UPDATED = "profile.updated"
EVENT_FRIEND_REQUEST_SENT = "friend.request_sent"
EVENT_FRIEND_REQUEST_ACCEPTED = "friend.request_accepted"
EVENT_FRIEND_REQUEST_REJECTED = "friend.request_rejected"
EVENT_FRIEND_REMOVED = "friend.removed"
EVENT_GROUP_CREATED = "group.created"
EVENT_GROUP_RENAMED = "group.renamed"
EVENT_GROUP_DELETED = "group.deleted"
EVENT_GROUP_MEMBER_ADDED = "group.member_added"
EVENT_GROUP_MEMBER_REMOVED = "group.member_removed"
EVENT_GROUP_OWNER_TRANSFERRED = "group.owner_transferred"
EVENT_TRACK_SHARED = "track.shared"
EVENT_TRACK_REMOVED = "track.removed"
EVENT_TRACK_METADATA_FAILED = "track.metadata_failed"

GROUP_ACTIVITY_EVENT_TYPES = frozenset(
    {
        EVENT_GROUP_CREATED,
        EVENT_GROUP_RENAMED,
        EVENT_GROUP_DELETED,
        EVENT_GROUP_MEMBER_ADDED,
        EVENT_GROUP_MEMBER_REMOVED,
        EVENT_GROUP_OWNER_TRANSFERRED,
        EVENT_TRACK_SHARED,
        EVENT_TRACK_REMOVED,
    }
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def log_activity_event(
    db: Session,
    *,
    event_type: str,
    actor_user_id: int | None = None,
    subject_user_id: int | None = None,
    group_id: int | None = None,
    track_share_id: int | None = None,
    details: dict[str, Any] | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        event_type=event_type,
        actor_user_id=actor_user_id,
        subject_user_id=subject_user_id,
        group_id=group_id,
        track_share_id=track_share_id,
        details=details or None,
        occurred_at=utcnow(),
    )
    db.add(event)
    db.flush()
    return event


def serialize_activity_event(event: ActivityEvent) -> ActivityEventSummary:
    title, detail = _render_activity_copy(event)
    return ActivityEventSummary(
        id=event.id,
        event_type=event.event_type,
        title=title,
        detail=detail,
        occurred_at=ensure_aware(event.occurred_at),
    )


def _render_activity_copy(event: ActivityEvent) -> tuple[str, str | None]:
    details = event.details or {}
    actor_username = _lookup_username(event, details, "actor_username", actor=True)
    subject_username = _lookup_username(event, details, "subject_username", actor=False)
    group_name = _detail_text(details, "group_name")
    track_title = _detail_text(details, "track_title")
    track_artist = _detail_text(details, "track_artist")
    source_label = _detail_text(details, "source_label")
    resolution_source = _detail_text(details, "resolution_source")
    error_detail = _detail_text(details, "error_detail")

    if event.event_type == EVENT_AUTH_REGISTERED:
        return f"{_format_handle(actor_username)} joined TuneTribe", None

    if event.event_type == EVENT_AUTH_LOGIN_SUCCEEDED:
        return f"{_format_handle(actor_username)} signed in", None

    if event.event_type == EVENT_PROFILE_UPDATED:
        changed_fields = details.get("changed_fields")
        detail = None
        if isinstance(changed_fields, list) and changed_fields:
            detail = ", ".join(str(field) for field in changed_fields)
        return f"{_format_handle(actor_username)} updated their profile", detail

    if event.event_type == EVENT_FRIEND_REQUEST_SENT:
        return f"{_format_handle(actor_username)} sent a friend request to {_format_handle(subject_username)}", None

    if event.event_type == EVENT_FRIEND_REQUEST_ACCEPTED:
        return f"{_format_handle(actor_username)} became friends with {_format_handle(subject_username)}", None

    if event.event_type == EVENT_FRIEND_REQUEST_REJECTED:
        return f"{_format_handle(actor_username)} declined {_format_handle(subject_username)}", None

    if event.event_type == EVENT_FRIEND_REMOVED:
        return f"{_format_handle(actor_username)} removed {_format_handle(subject_username)}", None

    if event.event_type == EVENT_GROUP_CREATED:
        return f"{_format_handle(actor_username)} created {group_name or 'a group'}", None

    if event.event_type == EVENT_GROUP_RENAMED:
        previous_name = _detail_text(details, "previous_name")
        new_name = _detail_text(details, "new_name") or group_name
        if previous_name and new_name:
            return f"{_format_handle(actor_username)} renamed {previous_name}", f"Now called {new_name}"
        return f"{_format_handle(actor_username)} updated a group name", None

    if event.event_type == EVENT_GROUP_DELETED:
        return f"{_format_handle(actor_username)} deleted {group_name or 'a group'}", None

    if event.event_type == EVENT_GROUP_MEMBER_ADDED:
        title = f"{_format_handle(actor_username)} added {_format_handle(subject_username)}"
        return title, group_name

    if event.event_type == EVENT_GROUP_MEMBER_REMOVED:
        title = f"{_format_handle(actor_username)} removed {_format_handle(subject_username)}"
        return title, group_name

    if event.event_type == EVENT_GROUP_OWNER_TRANSFERRED:
        title = f"{_format_handle(actor_username)} transferred ownership to {_format_handle(subject_username)}"
        return title, group_name

    if event.event_type == EVENT_TRACK_SHARED:
        title = f"{_format_handle(actor_username)} shared {track_title or 'a track'}"
        detail_parts = [track_artist, group_name, source_label]
        if resolution_source == "cache":
            detail_parts.append("cached metadata")
        elif resolution_source == "provider":
            detail_parts.append("fresh metadata")
        return title, _join_parts(detail_parts)

    if event.event_type == EVENT_TRACK_REMOVED:
        title = f"{_format_handle(actor_username)} removed {track_title or 'a track'}"
        return title, _join_parts([track_artist, group_name])

    if event.event_type == EVENT_TRACK_METADATA_FAILED:
        return f"{_format_handle(actor_username)} had a track lookup fail", _join_parts([group_name, error_detail])

    return f"{_format_handle(actor_username)} triggered {event.event_type}", None


def _lookup_username(
    event: ActivityEvent,
    details: dict[str, Any],
    key: str,
    *,
    actor: bool,
) -> str:
    snapshot = _detail_text(details, key)
    if snapshot:
        return snapshot
    user = event.actor if actor else event.subject_user
    if user is not None:
        return user.username
    return "member"


def _detail_text(details: dict[str, Any], key: str) -> str | None:
    value = details.get(key)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _format_handle(username: str) -> str:
    if username.startswith("@"):
        return username
    return f"@{username}"


def _join_parts(values: list[str | None]) -> str | None:
    parts = [value for value in values if value]
    if not parts:
        return None
    return " • ".join(parts)
