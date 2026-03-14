from __future__ import annotations

import html
import re
from urllib.parse import parse_qs, urlparse, urlunparse

from fastapi import HTTPException, status

from app.services.track_metadata.domain import (
    MetadataLookup,
    SUPPORTED_PROVIDER_MESSAGE,
    TrackSource,
    build_cache_key,
)


TITLE_NOISE_PATTERNS = [
    r"\(official [^)]+\)",
    r"\(lyrics?\)",
    r"\(audio\)",
    r"\(hd\)",
    r"\(4k[^\)]*\)",
    r"\[official [^\]]+\]",
    r"\[lyrics?\]",
]


def ensure_supported_url(raw_url: str) -> tuple[str, str]:
    parsed = urlparse(raw_url.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="A valid HTTPS music URL is required.")
    if parsed.username or parsed.password or parsed.fragment:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Music URLs must not include credentials or fragments.",
        )
    if parsed.port not in {None, 443}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Music URLs must use the provider's standard HTTPS port.",
        )

    host = _normalize_host(parsed.hostname)
    if not is_supported_host(host):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=SUPPORTED_PROVIDER_MESSAGE)

    return _canonicalize_url(parsed, host), host


def is_supported_host(host: str) -> bool:
    return any(
        (
            host == "spotify.com",
            host.endswith(".spotify.com"),
            host == "music.apple.com",
            host == "music.youtube.com",
            host == "youtube.com",
            host.endswith(".youtube.com"),
            host == "youtu.be",
            host == "soundcloud.com",
            host.endswith(".soundcloud.com"),
            host == "deezer.com",
            host.endswith(".deezer.com"),
            host == "tidal.com",
            host.endswith(".tidal.com"),
            host == "bandcamp.com",
            host.endswith(".bandcamp.com"),
            host == "audiomack.com",
            host.endswith(".audiomack.com"),
            host.startswith("music.amazon."),
            ".music.amazon." in host,
        )
    )


def detect_source(url: str) -> str:
    _, host = ensure_supported_url(url)
    if host == "music.apple.com":
        return TrackSource.APPLE_MUSIC
    if host == "music.youtube.com":
        return TrackSource.YOUTUBE_MUSIC
    if host == "youtube.com" or host.endswith(".youtube.com") or host == "youtu.be":
        return TrackSource.YOUTUBE
    if host == "soundcloud.com" or host.endswith(".soundcloud.com"):
        return TrackSource.SOUNDCLOUD
    if host == "deezer.com" or host.endswith(".deezer.com"):
        return TrackSource.DEEZER
    if host == "tidal.com" or host.endswith(".tidal.com"):
        return TrackSource.TIDAL
    if host == "bandcamp.com" or host.endswith(".bandcamp.com"):
        return TrackSource.BANDCAMP
    if host == "audiomack.com" or host.endswith(".audiomack.com"):
        return TrackSource.AUDIOMACK
    if host.startswith("music.amazon.") or ".music.amazon." in host:
        return TrackSource.AMAZON_MUSIC
    return TrackSource.SPOTIFY


def extract_source_identifier(url: str, source: str) -> str | None:
    parsed = urlparse(url)
    path_parts = [part for part in parsed.path.split("/") if part]
    if source == TrackSource.SPOTIFY:
        return path_parts[-1] if path_parts else None
    if source in {TrackSource.YOUTUBE, TrackSource.YOUTUBE_MUSIC}:
        if parsed.netloc.endswith("youtu.be"):
            return parsed.path.strip("/") or None
        return parse_qs(parsed.query).get("v", [None])[0]
    if source == TrackSource.APPLE_MUSIC:
        return parse_qs(parsed.query).get("i", [None])[0] or (path_parts[-1] if path_parts else None)
    if source in {TrackSource.DEEZER, TrackSource.TIDAL, TrackSource.AMAZON_MUSIC}:
        return path_parts[-1] if path_parts else None
    if source in {TrackSource.SOUNDCLOUD, TrackSource.BANDCAMP, TrackSource.AUDIOMACK}:
        return parsed.path.strip("/") or None
    return None


def build_metadata_lookup(url: str) -> MetadataLookup:
    canonical_url, host = ensure_supported_url(url)
    source = detect_source(canonical_url)
    source_identifier = extract_source_identifier(canonical_url, source)
    return MetadataLookup(
        canonical_url=canonical_url,
        host=host,
        source=source,
        source_identifier=source_identifier,
        cache_key=build_cache_key(source, source_identifier, canonical_url),
    )


def parse_video_title(raw_title: str, author_name: str) -> tuple[str, str]:
    parsed = parse_title_artist_pair(raw_title)
    if parsed is not None:
        return parsed
    cleaned_title = clean_track_text(raw_title)
    cleaned_author = clean_track_text(author_name)
    return cleaned_title or "Unknown Track", cleaned_author or "Unknown Artist"


def clean_track_text(value: str) -> str:
    cleaned = html.unescape(value or "")
    for pattern in TITLE_NOISE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -|")
    return cleaned


def parse_title_artist_pair(value: str) -> tuple[str, str] | None:
    cleaned = clean_track_text(value)
    if not cleaned:
        return None

    by_match = re.match(r"^(?P<title>.+?),?\s+by\s+(?P<artist>.+)$", cleaned, flags=re.IGNORECASE)
    if by_match:
        return (
            clean_track_text(by_match.group("title")) or "Unknown Track",
            clean_track_text(by_match.group("artist")) or "Unknown Artist",
        )

    for separator in (" - ", " | ", " – ", " — "):
        if separator not in cleaned:
            continue
        left, right = [part.strip() for part in cleaned.split(separator, 1)]
        if left and right:
            return clean_track_text(right) or "Unknown Track", clean_track_text(left) or "Unknown Artist"

    return None


def infer_track_from_description(description: str | None) -> tuple[str, str] | None:
    cleaned = clean_track_text(description or "")
    if not cleaned:
        return None

    patterns = [
        r"^(?:listen to|stream|watch)\s+(?P<title>.+?)\s+by\s+(?P<artist>.+?)(?:\s+(?:on|from)\s+.+)?[.!]?$",
        r"^(?P<title>.+?)\s+by\s+(?P<artist>.+?)(?:\s+(?:on|from)\s+.+)?[.!]?$",
    ]
    for pattern in patterns:
        match = re.match(pattern, cleaned, flags=re.IGNORECASE)
        if match:
            return (
                clean_track_text(match.group("title")) or "Unknown Track",
                clean_track_text(match.group("artist")) or "Unknown Artist",
            )

    return None


def humanize_slug(value: str) -> str:
    cleaned = re.sub(r"[-_]+", " ", value or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.title() if cleaned else "Unknown Track"


def first_non_empty(*values: str | None) -> str | None:
    for value in values:
        cleaned = clean_track_text(value or "")
        if cleaned:
            return cleaned
    return None


def extract_meta_property_content(html_body: str, property_name: str) -> str | None:
    return _extract_meta_content(html_body, "property", property_name)


def extract_meta_name_content(html_body: str, name: str) -> str | None:
    return _extract_meta_content(html_body, "name", name)


def extract_html_title(html_body: str) -> str | None:
    match = re.search(r"<title>([^<]+)</title>", html_body, flags=re.IGNORECASE)
    if not match:
        return None
    return html.unescape(match.group(1)).strip()


def _normalize_host(host: str) -> str:
    normalized = host.lower().strip(".")
    if normalized.startswith("www."):
        return normalized[4:]
    return normalized


def _canonicalize_url(parsed, host: str) -> str:
    netloc = host
    if parsed.port not in {None, 443}:
        netloc = f"{host}:{parsed.port}"
    return urlunparse((parsed.scheme.lower(), netloc, parsed.path, "", parsed.query, ""))


def _extract_meta_content(html_body: str, attribute_name: str, attribute_value: str) -> str | None:
    pattern = (
        rf'<meta[^>]+{attribute_name}=["\']{re.escape(attribute_value)}["\'][^>]+content=["\']([^"\']+)["\']'
        rf'|<meta[^>]+content=["\']([^"\']+)["\'][^>]+{attribute_name}=["\']{re.escape(attribute_value)}["\']'
    )
    match = re.search(pattern, html_body, flags=re.IGNORECASE)
    if not match:
        return None
    return html.unescape(next(group for group in match.groups() if group)).strip()
