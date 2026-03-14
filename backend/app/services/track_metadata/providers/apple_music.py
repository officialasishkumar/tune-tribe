from __future__ import annotations

import html
import re

import httpx

from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack, TrackSource
from app.services.track_metadata.http import fetch_provider_page
from app.services.track_metadata.providers.base import MusicMetadataProvider
from app.services.track_metadata.parsers import (
    extract_meta_property_content,
    humanize_slug,
    infer_track_from_description,
    parse_title_artist_pair,
)


class AppleMusicTrackProvider(MusicMetadataProvider):
    source = TrackSource.APPLE_MUSIC

    async def resolve(self, client: httpx.AsyncClient, lookup: MetadataLookup) -> ResolvedTrack:
        response, resolved_url = await fetch_provider_page(client, lookup.canonical_url)
        html_body = response.text

        og_title = extract_meta_property_content(html_body, "og:title")
        og_description = extract_meta_property_content(html_body, "og:description")
        parsed_pair = parse_title_artist_pair(og_title or "") or infer_track_from_description(og_description)

        parsed_url = resolved_url.rstrip("/").split("/")
        title_slug = parsed_url[-2] if len(parsed_url) >= 2 else ""
        title = humanize_slug(title_slug)
        artist_match = re.search(r'href="https://music\.apple\.com/[^"]+/artist/[^"]+">([^<]+)</a>', html_body)
        artist = html.unescape(artist_match.group(1)).strip() if artist_match else "Unknown Artist"
        if parsed_pair is not None:
            title, artist = parsed_pair

        genre_match = re.search(r'class="headings__metadata-bottom[^"]*">([^<]+)</div>', html_body)
        genre = "Unknown"
        if genre_match:
            genre = html.unescape(genre_match.group(1)).split("·")[0].strip() or "Unknown"

        artwork = (
            extract_meta_property_content(html_body, "og:image")
            or _extract_artwork_from_html(html_body)
        )

        return ResolvedTrack(
            source=self.source,
            source_url=resolved_url,
            source_identifier=lookup.source_identifier,
            title=title,
            artist=artist,
            album=None,
            genre=genre,
            album_art_url=artwork,
            duration_ms=None,
        )


def _extract_artwork_from_html(html_body: str) -> str | None:
    match = re.search(r'https://is1-ssl\.mzstatic\.com/image/thumb/[^"\s]+', html_body)
    if not match:
        return None
    return match.group(0)
