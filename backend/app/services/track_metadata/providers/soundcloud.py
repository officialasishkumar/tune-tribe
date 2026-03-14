from __future__ import annotations

import httpx

from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack, TrackSource
from app.services.track_metadata.providers.base import MusicMetadataProvider


class SoundCloudTrackProvider(MusicMetadataProvider):
    source = TrackSource.SOUNDCLOUD

    async def resolve(self, client: httpx.AsyncClient, lookup: MetadataLookup) -> ResolvedTrack:
        response = await client.get(
            "https://soundcloud.com/oembed",
            params={"url": lookup.canonical_url, "format": "json"},
        )
        response.raise_for_status()
        payload = response.json()

        return ResolvedTrack(
            source=self.source,
            source_url=lookup.canonical_url,
            source_identifier=lookup.source_identifier,
            title=payload.get("title", "Unknown Track"),
            artist=payload.get("author_name", "Unknown Artist"),
            album=None,
            genre="Unknown",
            album_art_url=payload.get("thumbnail_url"),
            duration_ms=None,
        )
