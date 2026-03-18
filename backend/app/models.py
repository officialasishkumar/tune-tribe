from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    bio: Mapped[str] = mapped_column(String(255), default="")
    favorite_genre: Mapped[str | None] = mapped_column(String(120), nullable=True)
    favorite_artist: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    login_count: Mapped[int] = mapped_column(Integer, default=0)
    profile_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owned_groups: Mapped[list[Group]] = relationship("Group", back_populates="owner")
    memberships: Mapped[list[GroupMembership]] = relationship("GroupMembership", back_populates="user")
    shared_tracks: Mapped[list[TrackShare]] = relationship("TrackShare", back_populates="shared_by")
    activity_events: Mapped[list[ActivityEvent]] = relationship(
        "ActivityEvent",
        foreign_keys="ActivityEvent.actor_user_id",
        back_populates="actor",
    )
    subject_events: Mapped[list[ActivityEvent]] = relationship(
        "ActivityEvent",
        foreign_keys="ActivityEvent.subject_user_id",
        back_populates="subject_user",
    )
    friends: Mapped[list[Friendship]] = relationship(
        "Friendship",
        foreign_keys="Friendship.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (UniqueConstraint("user_id", "friend_id", name="uq_friendship_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    friend_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped[User] = relationship("User", foreign_keys=[user_id], back_populates="friends")
    friend: Mapped[User] = relationship("User", foreign_keys=[friend_id])


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner: Mapped[User] = relationship("User", back_populates="owned_groups")
    memberships: Mapped[list[GroupMembership]] = relationship(
        "GroupMembership", back_populates="group", cascade="all, delete-orphan"
    )
    tracks: Mapped[list[TrackShare]] = relationship("TrackShare", back_populates="group", cascade="all, delete-orphan")
    activity_events: Mapped[list[ActivityEvent]] = relationship("ActivityEvent", back_populates="group")


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_membership"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    group: Mapped[Group] = relationship("Group", back_populates="memberships")
    user: Mapped[User] = relationship("User", back_populates="memberships")


class TrackShare(Base):
    __tablename__ = "track_shares"
    __table_args__ = (
        Index("ix_track_shares_group_shared_at", "group_id", "shared_at"),
        Index("ix_track_shares_shared_by_shared_at", "shared_by_id", "shared_at"),
        Index("ix_track_shares_group_signature", "group_id", "track_signature"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), index=True)
    shared_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(32), index=True)
    source_url: Mapped[str] = mapped_column(Text)
    source_identifier: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    artist: Mapped[str] = mapped_column(String(255), default="Unknown Artist")
    album: Mapped[str | None] = mapped_column(String(255), nullable=True)
    genre: Mapped[str] = mapped_column(String(120), default="Unknown")
    album_art_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    track_signature: Mapped[str] = mapped_column(String(255), index=True)
    shared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    group: Mapped[Group] = relationship("Group", back_populates="tracks")
    shared_by: Mapped[User] = relationship("User", back_populates="shared_tracks")
    activity_events: Mapped[list[ActivityEvent]] = relationship("ActivityEvent", back_populates="track_share")


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_events_occurred_at", "occurred_at"),
        Index("ix_activity_events_type_occurred_at", "event_type", "occurred_at"),
        Index("ix_activity_events_group_occurred_at", "group_id", "occurred_at"),
        Index("ix_activity_events_actor_occurred_at", "actor_user_id", "occurred_at"),
        Index("ix_activity_events_subject_occurred_at", "subject_user_id", "occurred_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    actor_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    subject_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    group_id: Mapped[int | None] = mapped_column(
        ForeignKey("groups.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    track_share_id: Mapped[int | None] = mapped_column(
        ForeignKey("track_shares.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    details: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    actor: Mapped[User | None] = relationship("User", foreign_keys=[actor_user_id], back_populates="activity_events")
    subject_user: Mapped[User | None] = relationship(
        "User",
        foreign_keys=[subject_user_id],
        back_populates="subject_events",
    )
    group: Mapped[Group | None] = relationship("Group", back_populates="activity_events")
    track_share: Mapped[TrackShare | None] = relationship("TrackShare", back_populates="activity_events")


class TrackMetadataCacheEntry(Base):
    __tablename__ = "track_metadata_cache"
    __table_args__ = (
        Index("ix_track_metadata_cache_expires_at", "expires_at"),
        Index("ix_track_metadata_cache_source", "source"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cache_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    lookup_url: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(32))
    source_url: Mapped[str] = mapped_column(Text)
    source_identifier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    artist: Mapped[str] = mapped_column(String(255))
    album: Mapped[str | None] = mapped_column(String(255), nullable=True)
    genre: Mapped[str] = mapped_column(String(120), default="Unknown")
    album_art_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider_name: Mapped[str] = mapped_column(String(64))
    hit_count: Mapped[int] = mapped_column(Integer, default=0)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refreshed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
