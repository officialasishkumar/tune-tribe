import pytest
from fastapi import HTTPException

from app.services.metadata import TrackSource, detect_source, ensure_supported_url, parse_video_title


def test_detect_source_supports_all_platforms() -> None:
    assert detect_source("https://open.spotify.com/track/abc") == TrackSource.SPOTIFY
    assert detect_source("https://music.apple.com/us/album/example/123?i=456") == TrackSource.APPLE_MUSIC
    assert detect_source("https://www.youtube.com/watch?v=abc") == TrackSource.YOUTUBE
    assert detect_source("https://music.youtube.com/watch?v=abc") == TrackSource.YOUTUBE_MUSIC


def test_parse_video_title_extracts_artist_and_title() -> None:
    title, artist = parse_video_title("Rick Astley - Never Gonna Give You Up (Official Video)", "Rick Astley")
    assert title == "Never Gonna Give You Up"
    assert artist == "Rick Astley"


@pytest.mark.parametrize(
    ("url", "message"),
    [
        ("http://open.spotify.com/track/abc", "HTTPS"),
        ("https://user:pass@open.spotify.com/track/abc", "credentials"),
        ("https://open.spotify.com:8443/track/abc", "standard HTTPS port"),
        ("https://open.spotify.com/track/abc#fragment", "fragments"),
    ],
)
def test_ensure_supported_url_rejects_unsafe_provider_urls(url: str, message: str) -> None:
    with pytest.raises(HTTPException, match=message):
        ensure_supported_url(url)
