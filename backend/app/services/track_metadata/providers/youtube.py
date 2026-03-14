from __future__ import annotations

import httpx

from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack
from app.services.track_metadata.providers.base import MusicMetadataProvider
from app.services.track_metadata.parsers import parse_video_title


class YouTubeTrackProvider(MusicMetadataProvider):
    def __init__(self, source: str) -> None:
        self.source = source

    async def resolve(self, client: httpx.AsyncClient, lookup: MetadataLookup) -> ResolvedTrack:
        response = await client.get(
            "https://www.youtube.com/oembed",
            params={"url": lookup.canonical_url, "format": "json"},
        )
        response.raise_for_status()
        payload = response.json()

        title, artist = parse_video_title(
            payload.get("title", ""),
            payload.get("author_name", "Unknown Artist"),
        )
        return ResolvedTrack(
            source=self.source,
            source_url=lookup.canonical_url,
            source_identifier=lookup.source_identifier,
            title=title,
            artist=artist,
            album=None,
            genre="Unknown",
            album_art_url=payload.get("thumbnail_url"),
            duration_ms=None,
        )
