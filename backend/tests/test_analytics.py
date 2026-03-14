from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.services.analytics import build_analytics


def test_build_analytics_aggregates_top_tracks_and_sources() -> None:
    now = datetime.now(timezone.utc)
    tracks = [
        SimpleNamespace(
            title="Song A",
            artist="Artist A",
            genre="Pop",
            source="spotify",
            shared_at=now,
            track_signature="songa::artista",
            shared_by=SimpleNamespace(username="alex"),
        ),
        SimpleNamespace(
            title="Song A",
            artist="Artist A",
            genre="Pop",
            source="youtube",
            shared_at=now - timedelta(days=1),
            track_signature="songa::artista",
            shared_by=SimpleNamespace(username="maya"),
        ),
        SimpleNamespace(
            title="Song B",
            artist="Artist B",
            genre="Jazz",
            source="spotify",
            shared_at=now - timedelta(days=2),
            track_signature="songb::artistb",
            shared_by=SimpleNamespace(username="alex"),
        ),
    ]

    analytics = build_analytics(tracks)

    assert analytics.stats[0].value == "3"
    assert analytics.top_tracks[0].title == "Song A"
    assert analytics.top_tracks[0].shares == 2
    assert analytics.source_loyalty[0].name == "Spotify"
