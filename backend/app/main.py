from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.bootstrap import run_startup_tasks
from app.config import get_settings
from app.db import engine, get_db
from app.deps import get_current_user
from app.models import Friendship, Group, GroupMembership, TrackShare, User
from app.schemas import (
    AnalyticsResponse,
    FriendRequest,
    FriendUser,
    GlobalStatsResponse,
    GroupCreateRequest,
    GroupSummary,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
    TrackCreateRequest,
    TrackSummary,
    UserSummary,
)
from app.security import create_access_token, hash_password, verify_password
from app.services.analytics import build_analytics, filter_tracks_by_window
from app.services.auth import find_user_by_identifier
from app.services.metadata import SOURCE_LABELS, resolve_track


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.run_startup_tasks_on_app_start:
            run_startup_tasks()
        yield

    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts or ["*"])

    @app.get("/api/health")
    def health() -> dict[str, str]:
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database unavailable.") from exc

        return {"status": "ok", "database": "ok"}

    @app.get("/api/stats", response_model=GlobalStatsResponse)
    def get_global_stats(db: Session = Depends(get_db)) -> GlobalStatsResponse:
        groups_created = db.scalar(select(func.count(Group.id))) or 0
        tracks_shared = db.scalar(select(func.count(TrackShare.id))) or 0
        active_members = db.scalar(select(func.count(User.id))) or 0
        return GlobalStatsResponse(
            groups_created=groups_created,
            tracks_shared=tracks_shared,
            active_members=active_members
        )

    @app.post("/api/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
    def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
        email_exists = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower()))
        if email_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account already exists for that email.")

        username_exists = db.scalar(select(User).where(User.username == payload.username))
        if username_exists:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That username is already taken.")

        user = User(
            email=payload.email.lower(),
            username=payload.username,
            display_name=payload.display_name.strip(),
            bio="",
            favorite_genre=payload.favorite_genre,
            favorite_artist=payload.favorite_artist,
            avatar_url=f"https://api.dicebear.com/9.x/initials/svg?seed={payload.username}",
            password_hash=hash_password(payload.password),
        )
        db.add(user)
        db.flush()

        personal_group = Group(name=f"{user.display_name}'s Tribe", owner_id=user.id)
        db.add(personal_group)
        db.flush()
        db.add(GroupMembership(group_id=personal_group.id, user_id=user.id, role="owner"))
        db.commit()
        db.refresh(user)

        return _token_response_for_user(user)

    @app.post("/api/auth/login", response_model=TokenResponse)
    def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
        user = find_user_by_identifier(db, payload.identifier)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email, username, or password.",
            )

        return _token_response_for_user(user)

    @app.get("/api/auth/me", response_model=UserSummary)
    def me(current_user: User = Depends(get_current_user)) -> UserSummary:
        return _serialize_user(current_user)

    @app.get("/api/profile", response_model=UserSummary)
    def get_profile(current_user: User = Depends(get_current_user)) -> UserSummary:
        return _serialize_user(current_user)

    @app.patch("/api/profile", response_model=UserSummary)
    def update_profile(
        payload: ProfileUpdateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> UserSummary:
        current_user.display_name = payload.display_name.strip()
        current_user.bio = payload.bio.strip()
        current_user.favorite_genre = payload.favorite_genre.strip() if payload.favorite_genre else None
        current_user.favorite_artist = payload.favorite_artist.strip() if payload.favorite_artist else None
        current_user.avatar_url = payload.avatar_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return _serialize_user(current_user)

    @app.get("/api/friends", response_model=list[FriendUser])
    def search_users(
        q: str = Query(default="", max_length=50),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[FriendUser]:
        friend_ids = _accepted_friend_id_set(db, current_user.id)
        pending_outgoing = _pending_outgoing_set(db, current_user.id)
        pending_incoming = _pending_incoming_set(db, current_user.id)
        users = db.scalars(
            select(User)
            .where(User.id != current_user.id)
            .where(
                or_(
                    User.username.ilike(f"%{q}%"),
                    User.display_name.ilike(f"%{q}%"),
                )
            )
            .order_by(User.display_name.asc())
            .limit(20)
        ).all()
        results = []
        for user in users:
            if user.id in friend_ids:
                fs = "accepted"
            elif user.id in pending_outgoing:
                fs = "pending_outgoing"
            elif user.id in pending_incoming:
                fs = "pending_incoming"
            else:
                fs = "none"
            results.append(
                FriendUser(
                    id=user.id,
                    username=user.username,
                    display_name=user.display_name,
                    avatar_url=user.avatar_url,
                    is_friend=user.id in friend_ids,
                    friendship_status=fs,
                )
            )
        return results

    @app.post("/api/friends/{friend_id}", response_model=FriendUser)
    def add_friend(
        friend_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> FriendUser:
        if friend_id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot add yourself as a friend.")

        friend = db.scalar(select(User).where(User.id == friend_id))
        if friend is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        existing = db.scalar(
            select(Friendship).where(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id)
        )
        if existing is not None:
            return FriendUser(
                id=friend.id,
                username=friend.username,
                display_name=friend.display_name,
                avatar_url=friend.avatar_url,
                is_friend=existing.status == "accepted",
                friendship_status="accepted" if existing.status == "accepted" else "pending_outgoing",
            )

        reverse = db.scalar(
            select(Friendship).where(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
        if reverse is not None and reverse.status == "pending":
            reverse.status = "accepted"
            db.add(Friendship(user_id=current_user.id, friend_id=friend_id, status="accepted"))
            db.commit()
            return FriendUser(
                id=friend.id,
                username=friend.username,
                display_name=friend.display_name,
                avatar_url=friend.avatar_url,
                is_friend=True,
                friendship_status="accepted",
            )

        db.add(Friendship(user_id=current_user.id, friend_id=friend_id, status="pending"))
        db.commit()

        return FriendUser(
            id=friend.id,
            username=friend.username,
            display_name=friend.display_name,
            avatar_url=friend.avatar_url,
            is_friend=False,
            friendship_status="pending_outgoing",
        )

    @app.delete("/api/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
    def remove_friend(
        friend_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        friendship = db.scalar(
            select(Friendship).where(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id)
        )
        if friendship is not None:
            db.delete(friendship)
        reverse = db.scalar(
            select(Friendship).where(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
        if reverse is not None:
            db.delete(reverse)
        db.commit()

    @app.get("/api/friends/requests", response_model=list[FriendRequest])
    def list_friend_requests(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[FriendRequest]:
        pending = db.scalars(
            select(Friendship)
            .where(Friendship.friend_id == current_user.id, Friendship.status == "pending")
            .options(joinedload(Friendship.user))
            .order_by(Friendship.created_at.desc())
        ).all()
        return [
            FriendRequest(
                id=req.id,
                from_user=FriendUser(
                    id=req.user.id,
                    username=req.user.username,
                    display_name=req.user.display_name,
                    avatar_url=req.user.avatar_url,
                    is_friend=False,
                    friendship_status="pending_incoming",
                ),
                created_at=_ensure_aware(req.created_at),
            )
            for req in pending
        ]

    @app.post("/api/friends/requests/{request_id}/accept", response_model=FriendUser)
    def accept_friend_request(
        request_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> FriendUser:
        req = db.scalar(
            select(Friendship)
            .where(Friendship.id == request_id, Friendship.friend_id == current_user.id, Friendship.status == "pending")
            .options(joinedload(Friendship.user))
        )
        if req is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
        req.status = "accepted"
        existing_reverse = db.scalar(
            select(Friendship).where(
                Friendship.user_id == current_user.id, Friendship.friend_id == req.user_id
            )
        )
        if existing_reverse is None:
            db.add(Friendship(user_id=current_user.id, friend_id=req.user_id, status="accepted"))
        else:
            existing_reverse.status = "accepted"
        db.commit()
        return FriendUser(
            id=req.user.id,
            username=req.user.username,
            display_name=req.user.display_name,
            avatar_url=req.user.avatar_url,
            is_friend=True,
            friendship_status="accepted",
        )

    @app.post("/api/friends/requests/{request_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
    def reject_friend_request(
        request_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        req = db.scalar(
            select(Friendship).where(
                Friendship.id == request_id, Friendship.friend_id == current_user.id, Friendship.status == "pending"
            )
        )
        if req is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found.")
        db.delete(req)
        db.commit()

    @app.get("/api/groups", response_model=list[GroupSummary])
    def list_groups(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[GroupSummary]:
        groups = db.scalars(
            select(Group)
            .join(GroupMembership, GroupMembership.group_id == Group.id)
            .where(GroupMembership.user_id == current_user.id)
            .options(
                joinedload(Group.memberships).joinedload(GroupMembership.user),
                joinedload(Group.tracks),
            )
            .order_by(Group.created_at.asc())
        ).unique().all()

        return [_serialize_group(group) for group in groups]

    @app.post("/api/groups", response_model=GroupSummary, status_code=status.HTTP_201_CREATED)
    def create_group(
        payload: GroupCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> GroupSummary:
        group = Group(name=payload.name.strip(), owner_id=current_user.id)
        db.add(group)
        db.flush()
        db.add(GroupMembership(group_id=group.id, user_id=current_user.id, role="owner"))

        member_ids = {member_id for member_id in payload.member_ids if member_id != current_user.id}
        if member_ids:
            users = db.scalars(select(User).where(User.id.in_(member_ids))).all()
            valid_ids = {user.id for user in users}
            for member_id in valid_ids:
                db.add(GroupMembership(group_id=group.id, user_id=member_id, role="member"))

        db.commit()
        db.refresh(group)
        group = db.scalar(
            select(Group)
            .where(Group.id == group.id)
            .options(joinedload(Group.memberships).joinedload(GroupMembership.user), joinedload(Group.tracks))
        )
        return _serialize_group(group)

    @app.get("/api/groups/{group_id}/tracks", response_model=list[TrackSummary])
    def list_group_tracks(
        group_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[TrackSummary]:
        group = _get_accessible_group(db, group_id, current_user.id)
        tracks = db.scalars(
            select(TrackShare)
            .where(TrackShare.group_id == group.id)
            .options(joinedload(TrackShare.shared_by))
            .order_by(TrackShare.shared_at.desc())
        ).all()
        return [_serialize_track(track) for track in tracks]

    @app.post("/api/groups/{group_id}/tracks", response_model=TrackSummary, status_code=status.HTTP_201_CREATED)
    async def add_track(
        group_id: int,
        payload: TrackCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> TrackSummary:
        group = _get_accessible_group(db, group_id, current_user.id)
        resolved = await resolve_track(payload.url)
        track = TrackShare(
            group_id=group.id,
            shared_by_id=current_user.id,
            source=resolved.source,
            source_url=resolved.source_url,
            source_identifier=resolved.source_identifier,
            title=resolved.title,
            artist=resolved.artist,
            album=resolved.album,
            genre=resolved.genre,
            album_art_url=resolved.album_art_url,
            duration_ms=resolved.duration_ms,
            track_signature=resolved.signature,
        )
        db.add(track)
        db.commit()
        db.refresh(track)
        track = db.scalar(select(TrackShare).where(TrackShare.id == track.id).options(joinedload(TrackShare.shared_by)))
        return _serialize_track(track)

    @app.get("/api/groups/{group_id}/analytics", response_model=AnalyticsResponse)
    def group_analytics(
        group_id: int,
        window: str = Query(default="30d"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> AnalyticsResponse:
        group = _get_accessible_group(db, group_id, current_user.id)
        tracks = db.scalars(
            select(TrackShare)
            .where(TrackShare.group_id == group.id)
            .options(joinedload(TrackShare.shared_by))
            .order_by(TrackShare.shared_at.desc())
        ).all()
        return build_analytics(filter_tracks_by_window(tracks, window))

    @app.get("/api/analytics/me", response_model=AnalyticsResponse)
    def personal_analytics(
        window: str = Query(default="30d"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> AnalyticsResponse:
        tracks = db.scalars(
            select(TrackShare)
            .where(TrackShare.shared_by_id == current_user.id)
            .options(joinedload(TrackShare.shared_by))
            .order_by(TrackShare.shared_at.desc())
        ).all()
        return build_analytics(filter_tracks_by_window(tracks, window))

    return app


app = create_app()


def _serialize_user(user: User) -> UserSummary:
    return UserSummary(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio or "",
        favorite_genre=user.favorite_genre,
        favorite_artist=user.favorite_artist,
        avatar_url=user.avatar_url,
    )


def _token_response_for_user(user: User) -> TokenResponse:
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=_serialize_user(user))


def _accepted_friend_id_set(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(Friendship.friend_id).where(Friendship.user_id == user_id, Friendship.status == "accepted")
    ).all()
    return set(rows)


def _pending_outgoing_set(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(Friendship.friend_id).where(Friendship.user_id == user_id, Friendship.status == "pending")
    ).all()
    return set(rows)


def _pending_incoming_set(db: Session, user_id: int) -> set[int]:
    rows = db.scalars(
        select(Friendship.user_id).where(Friendship.friend_id == user_id, Friendship.status == "pending")
    ).all()
    return set(rows)


def _serialize_group(group: Group) -> GroupSummary:
    last_active_at = None
    if group.tracks:
        last_active_at = max(track.shared_at for track in group.tracks)
    return GroupSummary(
        id=group.id,
        name=group.name,
        member_count=len(group.memberships),
        track_count=len(group.tracks),
        last_active_at=last_active_at,
        members=[membership.user.username for membership in group.memberships],
    )


def _serialize_track(track: TrackShare) -> TrackSummary:
    return TrackSummary(
        id=track.id,
        title=track.title,
        artist=track.artist,
        album=track.album,
        genre=track.genre or "Unknown",
        url=track.source_url,
        source=SOURCE_LABELS.get(track.source, track.source.title()),
        shared_by=track.shared_by.username,
        album_art_url=track.album_art_url,
        duration_ms=track.duration_ms,
        shared_at=_ensure_aware(track.shared_at),
    )


def _get_accessible_group(db: Session, group_id: int, user_id: int) -> Group:
    group = db.scalar(
        select(Group)
        .join(GroupMembership, GroupMembership.group_id == Group.id)
        .where(Group.id == group_id, GroupMembership.user_id == user_id)
        .options(joinedload(Group.memberships).joinedload(GroupMembership.user), joinedload(Group.tracks))
    )
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found.")
    return group


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)
