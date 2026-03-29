from __future__ import annotations

from functools import lru_cache
from typing import Callable

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.shared_cache import get_cache_store
from app.services.track_metadata.cache import InMemoryMetadataCache, LayeredMetadataCache
from app.services.track_metadata.cache import SharedMetadataCache
from app.services.track_metadata.domain import MetadataResolutionResult, ResolvedTrack, TrackSource
from app.services.track_metadata.enrichment import ItunesMetadataEnricher
from app.services.track_metadata.parsers import build_metadata_lookup
from app.services.track_metadata.providers import (
    AppleMusicTrackProvider,
    OpenGraphProviderConfig,
    OpenGraphTrackProvider,
    SoundCloudTrackProvider,
    SpotifyTrackProvider,
    YouTubeTrackProvider,
)
from app.services.track_metadata.providers.base import MusicMetadataProvider


class MetadataHttpClientFactory:
    def __init__(self, *, timeout_seconds: float) -> None:
        self.timeout_seconds = timeout_seconds

    def __call__(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=self.timeout_seconds,
            headers={"User-Agent": "TuneTribe/1.0 (+https://tunetribe.local)"},
        )


class TrackMetadataResolver:
    def __init__(
        self,
        *,
        providers: dict[str, MusicMetadataProvider],
        cache: LayeredMetadataCache,
        client_factory: Callable[[], httpx.AsyncClient],
        enricher: ItunesMetadataEnricher | None = None,
    ) -> None:
        self.providers = providers
        self.cache = cache
        self.client_factory = client_factory
        self.enricher = enricher

    async def resolve(self, url: str, db: Session | None = None) -> ResolvedTrack:
        return (await self.resolve_with_details(url, db=db)).track

    async def resolve_with_details(self, url: str, db: Session | None = None) -> MetadataResolutionResult:
        lookup = build_metadata_lookup(url)
        cached_track = self.cache.get(lookup, db=db)
        if cached_track is not None:
            return MetadataResolutionResult(
                track=cached_track,
                resolution_source="cache",
                provider_name=lookup.source,
            )

        provider = self.providers.get(lookup.source)
        if provider is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="The requested music provider is not configured.",
            )

        try:
            async with self.client_factory() as client:
                resolved_track = await provider.resolve(client, lookup)
                if self.enricher is not None:
                    resolved_track = await self.enricher.enrich(client, resolved_track)
        except HTTPException:
            raise
        except httpx.HTTPStatusError as exc:
            raise _map_http_status_error(exc) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The music provider could not be reached right now. Please try again.",
            ) from exc

        self.cache.set(lookup, resolved_track, db=db)
        return MetadataResolutionResult(
            track=resolved_track,
            resolution_source="provider",
            provider_name=lookup.source,
        )


def _map_http_status_error(exc: httpx.HTTPStatusError) -> HTTPException:
    status_code = exc.response.status_code
    if status_code in {400, 404, 410, 422}:
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="We couldn't resolve track metadata from that URL.",
        )
    if status_code == 429:
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The music provider is rate limiting requests right now. Please try again soon.",
        )
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="The music provider returned an unexpected response. Please try again.",
    )


def build_provider_registry() -> dict[str, MusicMetadataProvider]:
    return {
        TrackSource.SPOTIFY: SpotifyTrackProvider(),
        TrackSource.APPLE_MUSIC: AppleMusicTrackProvider(),
        TrackSource.YOUTUBE: YouTubeTrackProvider(TrackSource.YOUTUBE),
        TrackSource.YOUTUBE_MUSIC: YouTubeTrackProvider(TrackSource.YOUTUBE_MUSIC),
        TrackSource.SOUNDCLOUD: SoundCloudTrackProvider(),
        TrackSource.DEEZER: OpenGraphTrackProvider(OpenGraphProviderConfig(source=TrackSource.DEEZER)),
        TrackSource.TIDAL: OpenGraphTrackProvider(OpenGraphProviderConfig(source=TrackSource.TIDAL)),
        TrackSource.BANDCAMP: OpenGraphTrackProvider(OpenGraphProviderConfig(source=TrackSource.BANDCAMP)),
        TrackSource.AUDIOMACK: OpenGraphTrackProvider(OpenGraphProviderConfig(source=TrackSource.AUDIOMACK)),
        TrackSource.AMAZON_MUSIC: OpenGraphTrackProvider(OpenGraphProviderConfig(source=TrackSource.AMAZON_MUSIC)),
    }


@lru_cache
def get_track_metadata_resolver() -> TrackMetadataResolver:
    settings = get_settings()
    return TrackMetadataResolver(
        providers=build_provider_registry(),
        cache=LayeredMetadataCache(
            ttl_seconds=settings.metadata_cache_ttl_seconds,
            hot_cache=InMemoryMetadataCache(max_entries=settings.metadata_memory_cache_max_entries),
            shared_cache=SharedMetadataCache(store=get_cache_store()),
        ),
        client_factory=MetadataHttpClientFactory(timeout_seconds=settings.metadata_http_timeout_seconds),
        enricher=ItunesMetadataEnricher(),
    )
