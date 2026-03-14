from __future__ import annotations

import html
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Any
from urllib.parse import parse_qs, quote_plus, urljoin, urlparse

import httpx
from fastapi import HTTPException, status

from app.config import get_settings


ALLOWED_HOSTS = {
    "open.spotify.com",
    "spotify.com",
    "www.spotify.com",
    "music.apple.com",
    "youtube.com",
    "www.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "soundcloud.com",
    "m.soundcloud.com",
}


class TrackSource:
    SPOTIFY = "spotify"
    APPLE_MUSIC = "apple_music"
    YOUTUBE = "youtube"
    YOUTUBE_MUSIC = "youtube_music"
    SOUNDCLOUD = "soundcloud"


SOURCE_LABELS = {
    TrackSource.SPOTIFY: "Spotify",
    TrackSource.APPLE_MUSIC: "Apple Music",
    TrackSource.YOUTUBE: "YouTube",
    TrackSource.YOUTUBE_MUSIC: "YouTube Music",
    TrackSource.SOUNDCLOUD: "SoundCloud",
}


TITLE_NOISE_PATTERNS = [
    r"\(official [^)]+\)",
    r"\(lyrics?\)",
    r"\(audio\)",
    r"\(hd\)",
    r"\(4k[^\)]*\)",
    r"\[official [^\]]+\]",
    r"\[lyrics?\]",
]


@dataclass
class ResolvedTrack:
    source: str
    source_url: str
    source_identifier: str | None
    title: str
    artist: str
    album: str | None
    genre: str
    album_art_url: str | None
    duration_ms: int | None

    @property
    def signature(self) -> str:
        return f"{normalize_text(self.title)}::{normalize_text(self.artist)}"


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

    host = parsed.hostname.lower()
    if host.startswith("www."):
        host = host[4:]

    if host not in {h.removeprefix("www.") for h in ALLOWED_HOSTS}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unsupported music provider. Use Spotify, Apple Music, YouTube, YouTube Music, or SoundCloud.",
        )

    return parsed.geturl(), host


def detect_source(url: str) -> str:
    _, host = ensure_supported_url(url)
    if "spotify" in host:
        return TrackSource.SPOTIFY
    if host == "music.apple.com":
        return TrackSource.APPLE_MUSIC
    if host == "music.youtube.com":
        return TrackSource.YOUTUBE_MUSIC
    if "soundcloud.com" in host:
        return TrackSource.SOUNDCLOUD
    return TrackSource.YOUTUBE


def extract_source_identifier(url: str, source: str) -> str | None:
    parsed = urlparse(url)
    if source == TrackSource.SPOTIFY:
        parts = [part for part in parsed.path.split("/") if part]
        return parts[-1] if parts else None
    if source in {TrackSource.YOUTUBE, TrackSource.YOUTUBE_MUSIC}:
        if parsed.netloc.endswith("youtu.be"):
            return parsed.path.strip("/") or None
        return parse_qs(parsed.query).get("v", [None])[0]
    if source == TrackSource.APPLE_MUSIC:
        return parse_qs(parsed.query).get("i", [None])[0] or parsed.path.rstrip("/").split("/")[-1]
    if source == TrackSource.SOUNDCLOUD:
        return parsed.path.strip("/") or None
    return None


async def resolve_track(url: str) -> ResolvedTrack:
    canonical_url, _ = ensure_supported_url(url)
    source = detect_source(canonical_url)
    source_identifier = extract_source_identifier(canonical_url, source)

    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "TuneTribe/1.0 (+https://tunetribe.local)"},
        ) as client:
            if source == TrackSource.SPOTIFY:
                resolved = await _resolve_spotify(client, canonical_url, source_identifier)
            elif source in {TrackSource.YOUTUBE, TrackSource.YOUTUBE_MUSIC}:
                resolved = await _resolve_youtube(client, canonical_url, source_identifier, source)
            elif source == TrackSource.SOUNDCLOUD:
                resolved = await _resolve_soundcloud(client, canonical_url, source_identifier)
            else:
                resolved = await _resolve_apple_music(client, canonical_url, source_identifier)

            enriched = await _enrich_with_itunes(client, resolved.title, resolved.artist)
            if enriched:
                resolved.title = enriched.get("title", resolved.title)
                resolved.artist = enriched.get("artist", resolved.artist)
                resolved.album = enriched.get("album", resolved.album)
                resolved.genre = enriched.get("genre", resolved.genre)
                resolved.album_art_url = enriched.get("album_art_url", resolved.album_art_url)
                resolved.duration_ms = enriched.get("duration_ms", resolved.duration_ms)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The music provider could not be reached right now. Please try again.",
        ) from exc

    return resolved


async def _resolve_spotify(client: httpx.AsyncClient, url: str, source_identifier: str | None) -> ResolvedTrack:
    oembed_response = await client.get(f"https://open.spotify.com/oembed?url={quote_plus(url)}")
    oembed_response.raise_for_status()
    oembed = oembed_response.json()

    page_response, resolved_url = await _fetch_provider_page(client, url)
    description = _extract_meta_content(page_response.text, "og:description")
    artist = "Unknown Artist"
    album = None
    if description:
        parts = [part.strip() for part in description.split("·")]
        if len(parts) >= 2:
            artist = parts[0]
        if len(parts) >= 3:
            album = parts[1]

    return ResolvedTrack(
        source=TrackSource.SPOTIFY,
        source_url=resolved_url,
        source_identifier=source_identifier,
        title=oembed.get("title", "Unknown Track"),
        artist=artist,
        album=album,
        genre="Unknown",
        album_art_url=oembed.get("thumbnail_url"),
        duration_ms=None,
    )


async def _resolve_youtube(
    client: httpx.AsyncClient,
    url: str,
    source_identifier: str | None,
    source: str,
) -> ResolvedTrack:
    oembed_response = await client.get(f"https://www.youtube.com/oembed?url={quote_plus(url)}&format=json")
    oembed_response.raise_for_status()
    payload = oembed_response.json()

    parsed_title, parsed_artist = parse_video_title(payload.get("title", ""), payload.get("author_name", "Unknown Artist"))
    return ResolvedTrack(
        source=source,
        source_url=url,
        source_identifier=source_identifier,
        title=parsed_title,
        artist=parsed_artist,
        album=None,
        genre="Unknown",
        album_art_url=payload.get("thumbnail_url"),
        duration_ms=None,
    )


async def _resolve_soundcloud(
    client: httpx.AsyncClient,
    url: str,
    source_identifier: str | None,
) -> ResolvedTrack:
    oembed_response = await client.get(f"https://soundcloud.com/oembed?url={quote_plus(url)}&format=json")
    oembed_response.raise_for_status()
    payload = oembed_response.json()

    return ResolvedTrack(
        source=TrackSource.SOUNDCLOUD,
        source_url=url,
        source_identifier=source_identifier,
        title=payload.get("title", "Unknown Track"),
        artist=payload.get("author_name", "Unknown Artist"),
        album=None,
        genre="Unknown",
        album_art_url=payload.get("thumbnail_url"),
        duration_ms=None,
    )


async def _resolve_apple_music(
    client: httpx.AsyncClient,
    url: str,
    source_identifier: str | None,
) -> ResolvedTrack:
    response, resolved_url = await _fetch_provider_page(client, url)
    html_body = response.text

    parsed = urlparse(resolved_url)
    path_parts = [part for part in parsed.path.split("/") if part]
    title_slug = path_parts[-2] if len(path_parts) >= 2 else "unknown-track"
    title = title_slug.replace("-", " ").strip() or "Unknown Track"
    artist_match = re.search(r'href="https://music\.apple\.com/[^"]+/artist/[^"]+">([^<]+)</a>', html_body)
    genre_match = re.search(r'class="headings__metadata-bottom[^"]*">([^<]+)</div>', html_body)
    artwork_match = re.search(r'https://is1-ssl\.mzstatic\.com/image/thumb/[^"\s]+', html_body)

    artist = html.unescape(artist_match.group(1)).strip() if artist_match else "Unknown Artist"
    genre = "Unknown"
    if genre_match:
        genre = html.unescape(genre_match.group(1)).split("·")[0].strip() or "Unknown"

    return ResolvedTrack(
        source=TrackSource.APPLE_MUSIC,
        source_url=resolved_url,
        source_identifier=source_identifier,
        title=title.title(),
        artist=artist,
        album=None,
        genre=genre,
        album_art_url=artwork_match.group(0) if artwork_match else None,
        duration_ms=None,
    )


async def _enrich_with_itunes(client: httpx.AsyncClient, title: str, artist: str) -> dict[str, Any] | None:
    query = quote_plus(f"{title} {artist}".strip())
    response = await client.get(f"https://itunes.apple.com/search?term={query}&entity=song&limit=10")
    response.raise_for_status()
    payload = response.json()
    results = payload.get("results", [])
    if not results:
        return None

    best = max(results, key=lambda item: _score_itunes_result(item, title, artist))
    return {
        "title": best.get("trackName", title),
        "artist": best.get("artistName", artist),
        "album": best.get("collectionName"),
        "genre": best.get("primaryGenreName", "Unknown"),
        "album_art_url": best.get("artworkUrl100", "").replace("100x100", "400x400") or None,
        "duration_ms": best.get("trackTimeMillis"),
    }


def _score_itunes_result(item: dict[str, Any], title: str, artist: str) -> float:
    track_ratio = SequenceMatcher(None, normalize_text(item.get("trackName", "")), normalize_text(title)).ratio()
    artist_ratio = SequenceMatcher(None, normalize_text(item.get("artistName", "")), normalize_text(artist)).ratio()
    return track_ratio * 2.0 + artist_ratio


def parse_video_title(raw_title: str, author_name: str) -> tuple[str, str]:
    cleaned = raw_title
    for pattern in TITLE_NOISE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" -")

    separators = [" - ", " | ", " – ", " — "]
    for separator in separators:
        if separator in cleaned:
            left, right = [part.strip() for part in cleaned.split(separator, 1)]
            if left and right:
                return right, left

    return cleaned or "Unknown Track", author_name or "Unknown Artist"


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _extract_meta_content(html_body: str, property_name: str) -> str | None:
    pattern = rf'<meta property="{re.escape(property_name)}" content="([^"]+)"'
    match = re.search(pattern, html_body)
    if not match:
        return None
    return html.unescape(match.group(1)).strip()


async def _fetch_provider_page(client: httpx.AsyncClient, url: str) -> tuple[httpx.Response, str]:
    current_url, _ = ensure_supported_url(url)
    max_redirects = get_settings().metadata_max_redirects

    for _ in range(max_redirects + 1):
        response = await client.get(current_url, follow_redirects=False)
        if response.status_code not in {301, 302, 303, 307, 308}:
            response.raise_for_status()
            return response, current_url

        location = response.headers.get("location")
        if not location:
            break

        next_url = urljoin(current_url, location)
        current_url, _ = ensure_supported_url(next_url)

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="The music provider returned too many redirects. Please try another link.",
    )
