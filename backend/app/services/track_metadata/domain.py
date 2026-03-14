from __future__ import annotations

import re
from dataclasses import dataclass
from hashlib import sha256


class TrackSource:
    SPOTIFY = "spotify"
    APPLE_MUSIC = "apple_music"
    YOUTUBE = "youtube"
    YOUTUBE_MUSIC = "youtube_music"
    SOUNDCLOUD = "soundcloud"
    DEEZER = "deezer"
    TIDAL = "tidal"
    BANDCAMP = "bandcamp"
    AUDIOMACK = "audiomack"
    AMAZON_MUSIC = "amazon_music"


SOURCE_LABELS = {
    TrackSource.SPOTIFY: "Spotify",
    TrackSource.APPLE_MUSIC: "Apple Music",
    TrackSource.YOUTUBE: "YouTube",
    TrackSource.YOUTUBE_MUSIC: "YouTube Music",
    TrackSource.SOUNDCLOUD: "SoundCloud",
    TrackSource.DEEZER: "Deezer",
    TrackSource.TIDAL: "TIDAL",
    TrackSource.BANDCAMP: "Bandcamp",
    TrackSource.AUDIOMACK: "Audiomack",
    TrackSource.AMAZON_MUSIC: "Amazon Music",
}

SUPPORTED_PROVIDER_MESSAGE = (
    "Unsupported music provider. Use a supported streaming or music platform URL."
)


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def build_cache_key(source: str, source_identifier: str | None, canonical_url: str) -> str:
    token = source_identifier.strip().lower() if source_identifier else canonical_url
    return sha256(f"{source}:{token}".encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class MetadataLookup:
    canonical_url: str
    host: str
    source: str
    source_identifier: str | None
    cache_key: str


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

    def copy(self) -> "ResolvedTrack":
        return ResolvedTrack(
            source=self.source,
            source_url=self.source_url,
            source_identifier=self.source_identifier,
            title=self.title,
            artist=self.artist,
            album=self.album,
            genre=self.genre,
            album_art_url=self.album_art_url,
            duration_ms=self.duration_ms,
        )
