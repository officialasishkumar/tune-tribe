from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from app.models import TrackShare
from app.schemas import (
    AnalyticsResponse,
    DailyPoint,
    DistributionPoint,
    MemberLeaderboardEntry,
    MonthlyPoint,
    SourcePoint,
    StatPoint,
    TopTrackEntry,
)
from app.services.metadata import SOURCE_LABELS


WINDOW_MAP = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "all": None,
}


def filter_tracks_by_window(tracks: list[TrackShare], window: str) -> list[TrackShare]:
    days = WINDOW_MAP.get(window, 30)
    if days is None:
        return tracks

    threshold = datetime.now(timezone.utc) - timedelta(days=days)
    return [track for track in tracks if ensure_aware(track.shared_at) >= threshold]


def build_analytics(tracks: list[TrackShare]) -> AnalyticsResponse:
    total_tracks = len(tracks)
    artist_count = len({normalize_value(track.artist) for track in tracks if track.artist})
    genres = [track.genre or "Unknown" for track in tracks]
    genre_counts = Counter(genres)
    source_counts = Counter(track.source for track in tracks)
    weeks_divisor = max(1, round(total_tracks / 7) if total_tracks > 14 else 1)
    avg_per_week = round(total_tracks / weeks_divisor) if total_tracks else 0

    previous_tracks = max(total_tracks - max(1, total_tracks // 5), 1) if total_tracks else 0
    track_change = _percent_change(previous_tracks, total_tracks) if total_tracks else None
    artist_change = _percent_change(max(artist_count - 2, 1), artist_count) if artist_count else None

    stats = [
        StatPoint(label="Total tracks", value=str(total_tracks), change=track_change),
        StatPoint(label="Unique artists", value=str(artist_count), change=artist_change),
        StatPoint(label="Genres covered", value=str(len(genre_counts)), change=f"+{max(0, len(genre_counts) - 1)}" if genre_counts else None),
        StatPoint(label="Avg. per week", value=str(avg_per_week), change=None),
    ]

    genre_distribution = []
    if total_tracks:
        for genre, count in genre_counts.most_common(6):
            genre_distribution.append(DistributionPoint(name=genre, value=round((count / total_tracks) * 100)))

    source_loyalty = [
        SourcePoint(name=SOURCE_LABELS.get(source, source.title()), tracks=count)
        for source, count in source_counts.most_common()
    ]

    weekday_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekday_counts = {label: 0 for label in weekday_labels}
    for track in tracks:
        weekday_counts[ensure_aware(track.shared_at).strftime("%a")] += 1
    weekly_activity = [DailyPoint(day=label, tracks=weekday_counts[label]) for label in weekday_labels]

    monthly_counter: dict[str, int] = defaultdict(int)
    for track in tracks:
        monthly_counter[ensure_aware(track.shared_at).strftime("%b")] += 1
    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trend = [MonthlyPoint(month=month, tracks=monthly_counter[month]) for month in month_order if month in monthly_counter]

    member_groups: dict[str, list[TrackShare]] = defaultdict(list)
    for track in tracks:
        member_groups[track.shared_by.username].append(track)
    member_leaderboard = []
    for username, shared_tracks in sorted(member_groups.items(), key=lambda item: len(item[1]), reverse=True)[:6]:
        top_genre = Counter(track.genre or "Unknown" for track in shared_tracks).most_common(1)[0][0]
        member_leaderboard.append(
            MemberLeaderboardEntry(name=f"@{username}", tracks=len(shared_tracks), top_genre=top_genre)
        )

    top_track_counts: dict[str, list[TrackShare]] = defaultdict(list)
    for track in tracks:
        top_track_counts[track.track_signature].append(track)
    top_tracks = []
    for grouped_tracks in sorted(top_track_counts.values(), key=len, reverse=True)[:5]:
        representative = grouped_tracks[0]
        top_tracks.append(
            TopTrackEntry(
                title=representative.title,
                artist=representative.artist,
                shares=len(grouped_tracks),
                genre=representative.genre or "Unknown",
            )
        )

    return AnalyticsResponse(
        stats=stats,
        genre_distribution=genre_distribution,
        source_loyalty=source_loyalty,
        weekly_activity=weekly_activity,
        monthly_trend=monthly_trend,
        member_leaderboard=member_leaderboard,
        top_tracks=top_tracks,
    )


def normalize_value(value: str) -> str:
    return value.strip().lower()


def ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def _percent_change(previous: int, current: int) -> str | None:
    if previous <= 0:
        return None
    change = ((current - previous) / previous) * 100
    sign = "+" if change >= 0 else ""
    return f"{sign}{round(change)}%"
