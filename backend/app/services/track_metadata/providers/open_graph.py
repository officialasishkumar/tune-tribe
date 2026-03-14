from __future__ import annotations

from dataclasses import dataclass

import httpx

from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack
from app.services.track_metadata.http import fetch_provider_page
from app.services.track_metadata.providers.base import MusicMetadataProvider
from app.services.track_metadata.parsers import (
    extract_html_title,
    extract_meta_name_content,
    extract_meta_property_content,
    first_non_empty,
    humanize_slug,
    infer_track_from_description,
    parse_title_artist_pair,
)


@dataclass(frozen=True)
class OpenGraphProviderConfig:
    source: str
    default_genre: str = "Unknown"


class OpenGraphTrackProvider(MusicMetadataProvider):
    def __init__(self, config: OpenGraphProviderConfig) -> None:
        self.source = config.source
        self._config = config

    async def resolve(self, client: httpx.AsyncClient, lookup: MetadataLookup) -> ResolvedTrack:
        response, resolved_url = await fetch_provider_page(client, lookup.canonical_url)
        html_body = response.text

        title_candidate = first_non_empty(
            extract_meta_property_content(html_body, "og:title"),
            extract_meta_name_content(html_body, "twitter:title"),
            extract_html_title(html_body),
        )
        description = first_non_empty(
            extract_meta_property_content(html_body, "og:description"),
            extract_meta_name_content(html_body, "description"),
            extract_meta_name_content(html_body, "twitter:description"),
        )
        parsed_pair = parse_title_artist_pair(title_candidate or "") or infer_track_from_description(description)

        title = title_candidate or humanize_slug(resolved_url.rstrip("/").split("/")[-1])
        artist = first_non_empty(
            extract_meta_property_content(html_body, "music:musician"),
            extract_meta_property_content(html_body, "og:audio:artist"),
            extract_meta_name_content(html_body, "author"),
        ) or "Unknown Artist"
        if parsed_pair is not None:
            title, artist = parsed_pair

        album = extract_meta_property_content(html_body, "music:album")
        artwork = first_non_empty(
            extract_meta_property_content(html_body, "og:image"),
            extract_meta_name_content(html_body, "twitter:image"),
        )

        return ResolvedTrack(
            source=self.source,
            source_url=resolved_url,
            source_identifier=lookup.source_identifier,
            title=title or "Unknown Track",
            artist=artist or "Unknown Artist",
            album=album,
            genre=self._config.default_genre,
            album_art_url=artwork,
            duration_ms=None,
        )
