from __future__ import annotations

from datetime import datetime

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.validation import (
    normalize_bio_text,
    normalize_optional_text,
    normalize_required_text,
    validate_music_url,
    validate_profile_image_url,
)


def to_camel(field_name: str) -> str:
    parts = field_name.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class UserSummary(APIModel):
    id: int
    email: EmailStr
    username: str
    display_name: str
    bio: str = ""
    favorite_genre: str | None = None
    favorite_artist: str | None = None
    avatar_url: str | None = None


class TokenResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary


class RegisterRequest(APIModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=24)
    display_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=1, max_length=128)
    favorite_genre: str | None = Field(default=None, max_length=120)
    favorite_artist: str | None = Field(default=None, max_length=120)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned.replace("_", "").isalnum():
            raise ValueError("Username may contain only letters, numbers, and underscores.")
        return cleaned

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Display name")

    @field_validator("favorite_genre")
    @classmethod
    def normalize_favorite_genre(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite genre")

    @field_validator("favorite_artist")
    @classmethod
    def normalize_favorite_artist(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite artist")


class LoginRequest(APIModel):
    identifier: str = Field(
        min_length=3,
        max_length=255,
        validation_alias=AliasChoices("identifier", "email"),
    )
    password: str = Field(min_length=1, max_length=128)

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Email or username")


class ProfileUpdateRequest(APIModel):
    display_name: str = Field(min_length=2, max_length=120)
    bio: str = Field(default="", max_length=255)
    favorite_genre: str | None = Field(default=None, max_length=120)
    favorite_artist: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Display name")

    @field_validator("bio")
    @classmethod
    def normalize_bio(cls, value: str) -> str:
        return normalize_bio_text(value)

    @field_validator("favorite_genre")
    @classmethod
    def normalize_favorite_genre(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite genre")

    @field_validator("favorite_artist")
    @classmethod
    def normalize_favorite_artist(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, field_name="Favorite artist")

    @field_validator("avatar_url")
    @classmethod
    def normalize_avatar_url(cls, value: str | None) -> str | None:
        return validate_profile_image_url(value)


class FriendUser(APIModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    is_friend: bool
    friendship_status: str = "none"


class FriendRequest(APIModel):
    id: int
    from_user: FriendUser
    created_at: datetime


class GroupCreateRequest(APIModel):
    name: str = Field(min_length=2, max_length=120)
    member_ids: list[int] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return normalize_required_text(value, field_name="Group name")

    @field_validator("member_ids")
    @classmethod
    def normalize_member_ids(cls, value: list[int]) -> list[int]:
        deduplicated: list[int] = []
        seen: set[int] = set()
        for member_id in value:
            if member_id <= 0:
                raise ValueError("Member IDs must be positive integers.")
            if member_id not in seen:
                seen.add(member_id)
                deduplicated.append(member_id)
        return deduplicated


class GroupSummary(APIModel):
    id: int
    name: str
    member_count: int
    track_count: int
    last_active_at: datetime | None
    members: list[str]
    is_owner: bool = False


class TrackCreateRequest(APIModel):
    url: str = Field(min_length=8, max_length=1000)

    @field_validator("url")
    @classmethod
    def normalize_url(cls, value: str) -> str:
        return validate_music_url(value)


class TrackSummary(APIModel):
    id: int
    title: str
    artist: str
    album: str | None = None
    genre: str
    url: str
    source: str
    shared_by: str
    album_art_url: str | None = None
    duration_ms: int | None = None
    shared_at: datetime


class StatPoint(APIModel):
    label: str
    value: str
    change: str | None = None


class DistributionPoint(APIModel):
    name: str
    value: int


class SourcePoint(APIModel):
    name: str
    tracks: int


class DailyPoint(APIModel):
    day: str
    tracks: int


class ActivityHeatmapPoint(APIModel):
    date: str
    count: int
    level: int


class MonthlyPoint(APIModel):
    month: str
    tracks: int


class MemberLeaderboardEntry(APIModel):
    name: str
    tracks: int
    top_genre: str


class TopTrackEntry(APIModel):
    title: str
    artist: str
    shares: int
    genre: str


class GlobalStatsResponse(APIModel):
    groups_created: int
    tracks_shared: int
    active_members: int


class AnalyticsResponse(APIModel):
    stats: list[StatPoint]
    genre_distribution: list[DistributionPoint]
    source_loyalty: list[SourcePoint]
    weekly_activity: list[DailyPoint]
    activity_heatmap: list[ActivityHeatmapPoint]
    monthly_trend: list[MonthlyPoint]
    member_leaderboard: list[MemberLeaderboardEntry]
    top_tracks: list[TopTrackEntry]
