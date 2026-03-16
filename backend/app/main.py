from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.bootstrap import run_startup_tasks
from app.config import get_settings
from app.db import engine, get_db
from app.deps import get_current_user
from app.http import install_security_middleware
from app.models import Friendship, Group, GroupMembership, TrackShare, User
from app.schemas import (
    AnalyticsResponse,
    FriendLookupQuery,
    FriendLookupResponse,
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
from app.services.api_cache import get_api_response_cache
from app.services.auth import find_user_by_identifier
from app.services.metadata import SOURCE_LABELS, resolve_track
from app.services.rate_limit import get_auth_rate_limiter, get_friend_lookup_rate_limiter


AnalyticsWindow = Literal["7d", "30d", "90d", "all"]


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.run_startup_tasks_on_app_start:
            run_startup_tasks()
        yield

    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    install_security_middleware(app, environment=settings.environment)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

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
        api_cache = get_api_response_cache()
        cached_response = api_cache.get_global_stats()
        if cached_response is not None:
            return cached_response

        groups_created = db.scalar(select(func.count(Group.id))) or 0
        tracks_shared = db.scalar(select(func.count(TrackShare.id))) or 0
        active_members = db.scalar(select(func.count(User.id))) or 0
        response = GlobalStatsResponse(
            groups_created=groups_created,
            tracks_shared=tracks_shared,
            active_members=active_members
        )
        api_cache.set_global_stats(response)
        return response

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
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with those credentials already exists.",
            ) from exc

        db.refresh(user)
        get_api_response_cache().invalidate_global_stats()

        return _token_response_for_user(user)

    @app.post("/api/auth/login", response_model=TokenResponse)
    def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
        limiter = get_auth_rate_limiter()
        rate_limit_key = _build_auth_rate_limit_key(request, payload.identifier)
        rate_limit_decision = limiter.check(rate_limit_key)
        if not rate_limit_decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please wait and try again.",
                headers={"Retry-After": str(rate_limit_decision.retry_after_seconds)},
            )

        user = find_user_by_identifier(db, payload.identifier)
        if user is None or not verify_password(payload.password, user.password_hash):
            limiter.record_failure(rate_limit_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email, username, or password.",
            )

        limiter.clear(rate_limit_key)
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
        current_user.display_name = payload.display_name
        current_user.bio = payload.bio
        current_user.favorite_genre = payload.favorite_genre
        current_user.favorite_artist = payload.favorite_artist
        current_user.avatar_url = payload.avatar_url
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        return _serialize_user(current_user)

    @app.get("/api/friends/lookup", response_model=FriendLookupResponse)
    def lookup_friend_by_username(
        request: Request,
        params: FriendLookupQuery = Depends(),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> FriendLookupResponse:
        limiter = get_friend_lookup_rate_limiter()
        rate_limit_key = _build_friend_lookup_rate_limit_key(request, current_user.id)
        rate_limit_decision = limiter.check(rate_limit_key)
        if not rate_limit_decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many username lookups. Please wait and try again.",
                headers={"Retry-After": str(rate_limit_decision.retry_after_seconds)},
            )

        limiter.record_attempt(rate_limit_key)
        if params.username == current_user.username:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot add yourself as a friend.")

        friend_ids = _accepted_friend_id_set(db, current_user.id)
        pending_outgoing = _pending_outgoing_set(db, current_user.id)
        pending_incoming = _pending_incoming_set(db, current_user.id)
        user = db.scalar(
            select(User).where(User.id != current_user.id, User.username == params.username)
        )
        if user is None:
            return FriendLookupResponse(user=None)

        return FriendLookupResponse(
            user=_serialize_friend_user(
                user,
                friend_ids=friend_ids,
                pending_outgoing=pending_outgoing,
                pending_incoming=pending_incoming,
            )
        )

    @app.get("/api/friends/list", response_model=list[FriendUser])
    def list_friends(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> list[FriendUser]:
        friend_ids = _accepted_friend_id_set(db, current_user.id)
        if not friend_ids:
            return []
        users = db.scalars(
            select(User)
            .where(User.id.in_(friend_ids))
            .order_by(User.display_name.asc())
        ).all()
        return [
            _serialize_friend_user(user, friend_ids=friend_ids)
            for user in users
        ]

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
            friendship_status = "accepted" if existing.status == "accepted" else "pending_outgoing"
            return FriendUser(
                id=friend.id,
                username=friend.username,
                display_name=friend.display_name,
                avatar_url=friend.avatar_url,
                is_friend=existing.status == "accepted",
                friendship_status=friendship_status,
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

        # Remove each other from each other's groups
        db.execute(
            delete(GroupMembership)
            .where(GroupMembership.user_id == friend_id)
            .where(GroupMembership.group_id.in_(
                select(Group.id).where(Group.owner_id == current_user.id)
            ))
        )
        db.execute(
            delete(GroupMembership)
            .where(GroupMembership.user_id == current_user.id)
            .where(GroupMembership.group_id.in_(
                select(Group.id).where(Group.owner_id == friend_id)
            ))
        )
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

        return [_serialize_group(group, current_user.id) for group in groups]

    @app.post("/api/groups", response_model=GroupSummary, status_code=status.HTTP_201_CREATED)
    def create_group(
        payload: GroupCreateRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> GroupSummary:
        group = Group(name=payload.name, owner_id=current_user.id)
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
        get_api_response_cache().invalidate_global_stats()
        return _serialize_group(group, current_user.id)

    @app.delete("/api/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_group(
        group_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        group = db.scalar(select(Group).where(Group.id == group_id, Group.owner_id == current_user.id))
        if group is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found or you don't have permission.")
        affected_user_ids = db.scalars(
            select(TrackShare.shared_by_id).where(TrackShare.group_id == group_id).distinct()
        ).all()
        db.delete(group)
        db.commit()
        api_cache = get_api_response_cache()
        api_cache.invalidate_global_stats()
        api_cache.invalidate_group_analytics(group_id)
        for user_id in affected_user_ids:
            api_cache.invalidate_personal_analytics(user_id)

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
        resolved = await resolve_track(payload.url, db=db)
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
        api_cache = get_api_response_cache()
        api_cache.invalidate_global_stats()
        api_cache.invalidate_group_analytics(group.id)
        api_cache.invalidate_personal_analytics(current_user.id)
        return _serialize_track(track)

    @app.get("/api/groups/{group_id}/analytics", response_model=AnalyticsResponse)
    def group_analytics(
        group_id: int,
        window: AnalyticsWindow = Query(default="30d"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> AnalyticsResponse:
        group = _get_accessible_group(db, group_id, current_user.id)
        api_cache = get_api_response_cache()
        cached_response = api_cache.get_group_analytics(group_id=group.id, window=window)
        if cached_response is not None:
            return cached_response

        tracks = db.scalars(
            select(TrackShare)
            .where(TrackShare.group_id == group.id)
            .options(joinedload(TrackShare.shared_by))
            .order_by(TrackShare.shared_at.desc())
        ).all()
        response = build_analytics(filter_tracks_by_window(tracks, window))
        api_cache.set_group_analytics(group_id=group.id, window=window, response=response)
        return response

    @app.get("/api/analytics/me", response_model=AnalyticsResponse)
    def personal_analytics(
        window: AnalyticsWindow = Query(default="30d"),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> AnalyticsResponse:
        api_cache = get_api_response_cache()
        cached_response = api_cache.get_personal_analytics(user_id=current_user.id, window=window)
        if cached_response is not None:
            return cached_response

        tracks = db.scalars(
            select(TrackShare)
            .where(TrackShare.shared_by_id == current_user.id)
            .options(joinedload(TrackShare.shared_by))
            .order_by(TrackShare.shared_at.desc())
        ).all()
        response = build_analytics(filter_tracks_by_window(tracks, window))
        api_cache.set_personal_analytics(user_id=current_user.id, window=window, response=response)
        return response

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


def _serialize_friend_user(
    user: User,
    *,
    friend_ids: set[int],
    pending_outgoing: set[int] | None = None,
    pending_incoming: set[int] | None = None,
) -> FriendUser:
    outgoing_ids = pending_outgoing or set()
    incoming_ids = pending_incoming or set()

    friendship_status = "none"
    if user.id in friend_ids:
        friendship_status = "accepted"
    elif user.id in outgoing_ids:
        friendship_status = "pending_outgoing"
    elif user.id in incoming_ids:
        friendship_status = "pending_incoming"

    return FriendUser(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        is_friend=user.id in friend_ids,
        friendship_status=friendship_status,
    )


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


def _serialize_group(group: Group, current_user_id: int) -> GroupSummary:
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
        is_owner=group.owner_id == current_user_id,
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


def _build_auth_rate_limit_key(request: Request, identifier: str) -> str:
    client_host = request.client.host if request.client is not None else "unknown"
    return f"{client_host}:{identifier.strip().lower()}"


def _build_friend_lookup_rate_limit_key(request: Request, user_id: int) -> str:
    client_host = request.client.host if request.client is not None else "unknown"
    return f"{user_id}:{client_host}"
