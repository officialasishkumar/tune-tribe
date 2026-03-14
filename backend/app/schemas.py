from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
    password: str = Field(min_length=8, max_length=128)
    favorite_genre: str | None = Field(default=None, max_length=120)
    favorite_artist: str | None = Field(default=None, max_length=120)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned.replace("_", "").isalnum():
            raise ValueError("Username may contain only letters, numbers, and underscores.")
        return cleaned


class LoginRequest(APIModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdateRequest(APIModel):
    display_name: str = Field(min_length=2, max_length=120)
    bio: str = Field(default="", max_length=255)
    favorite_genre: str | None = Field(default=None, max_length=120)
    favorite_artist: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)


class FriendUser(APIModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    is_friend: bool


class GroupCreateRequest(APIModel):
    name: str = Field(min_length=2, max_length=120)
    member_ids: list[int] = Field(default_factory=list)


class GroupSummary(APIModel):
    id: int
    name: str
    member_count: int
    track_count: int
    last_active_at: datetime | None
    members: list[str]


class TrackCreateRequest(APIModel):
    url: str = Field(min_length=8, max_length=1000)


class TrackSummary(APIModel):
    id: int
    title: str
    artist: str
    genre: str
    url: str
    source: str
    shared_by: str
    album_art_url: str | None = None
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
    monthly_trend: list[MonthlyPoint]
    member_leaderboard: list[MemberLeaderboardEntry]
    top_tracks: list[TopTrackEntry]
