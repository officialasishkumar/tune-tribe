from __future__ import annotations

import httpx

from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack, TrackSource
from app.services.track_metadata.http import fetch_provider_page
from app.services.track_metadata.providers.base import MusicMetadataProvider
from app.services.track_metadata.parsers import extract_meta_property_content


class SpotifyTrackProvider(MusicMetadataProvider):
    source = TrackSource.SPOTIFY

    async def resolve(self, client: httpx.AsyncClient, lookup: MetadataLookup) -> ResolvedTrack:
        oembed_response = await client.get("https://open.spotify.com/oembed", params={"url": lookup.canonical_url})
        oembed_response.raise_for_status()
        oembed = oembed_response.json()

        page_response, resolved_url = await fetch_provider_page(client, lookup.canonical_url)
        description = extract_meta_property_content(page_response.text, "og:description")
        artist = "Unknown Artist"
        album = None
        if description:
            parts = [part.strip() for part in description.split("·")]
            if len(parts) >= 2:
                artist = parts[0]
            if len(parts) >= 3:
                album = parts[1]

        return ResolvedTrack(
            source=self.source,
            source_url=resolved_url,
            source_identifier=lookup.source_identifier,
            title=oembed.get("title", "Unknown Track"),
            artist=artist,
            album=album,
            genre="Unknown",
            album_art_url=oembed.get("thumbnail_url"),
            duration_ms=None,
        )
