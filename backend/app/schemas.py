from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserSummary(BaseModel):
    id: int
    email: EmailStr
    username: str
    display_name: str
    bio: str = ""
    avatar_url: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=24)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned.replace("_", "").isalnum():
            raise ValueError("Username may contain only letters, numbers, and underscores.")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdateRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=120)
    bio: str = Field(default="", max_length=255)
    avatar_url: str | None = Field(default=None, max_length=500)


class FriendUser(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    is_friend: bool


class GroupCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    member_ids: list[int] = Field(default_factory=list)


class GroupSummary(BaseModel):
    id: int
    name: str
    member_count: int
    track_count: int
    last_active_at: datetime | None
    members: list[str]


class TrackCreateRequest(BaseModel):
    url: str = Field(min_length=8, max_length=1000)


class TrackSummary(BaseModel):
    id: int
    title: str
    artist: str
    genre: str
    url: str
    source: str
    shared_by: str
    album_art_url: str | None = None
    shared_at: datetime


class StatPoint(BaseModel):
    label: str
    value: str
    change: str | None = None


class DistributionPoint(BaseModel):
    name: str
    value: int


class SourcePoint(BaseModel):
    name: str
    tracks: int


class DailyPoint(BaseModel):
    day: str
    tracks: int


class MonthlyPoint(BaseModel):
    month: str
    tracks: int


class MemberLeaderboardEntry(BaseModel):
    name: str
    tracks: int
    top_genre: str


class TopTrackEntry(BaseModel):
    title: str
    artist: str
    shares: int
    genre: str


class AnalyticsResponse(BaseModel):
    stats: list[StatPoint]
    genre_distribution: list[DistributionPoint]
    source_loyalty: list[SourcePoint]
    weekly_activity: list[DailyPoint]
    monthly_trend: list[MonthlyPoint]
    member_leaderboard: list[MemberLeaderboardEntry]
    top_tracks: list[TopTrackEntry]
