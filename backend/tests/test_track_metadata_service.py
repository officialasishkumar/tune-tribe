from __future__ import annotations

import asyncio

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base
from app.services.shared_cache import CacheStore, MemoryCacheBackend
from app.services.track_metadata.cache import InMemoryMetadataCache, LayeredMetadataCache
from app.services.track_metadata.cache import SharedMetadataCache
from app.services.track_metadata.domain import ResolvedTrack, TrackSource
from app.services.track_metadata.service import TrackMetadataResolver


class DummyAsyncClient:
    async def __aenter__(self) -> "DummyAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class FakeProvider:
    source = TrackSource.SPOTIFY

    def __init__(self) -> None:
        self.calls = 0

    async def resolve(self, client, lookup) -> ResolvedTrack:
        self.calls += 1
        return ResolvedTrack(
            source=TrackSource.SPOTIFY,
            source_url=lookup.canonical_url,
            source_identifier=lookup.source_identifier,
            title="Midnight City",
            artist="M83",
            album="Hurry Up, We're Dreaming",
            genre="Electronic",
            album_art_url="https://cdn.example.com/midnight-city.jpg",
            duration_ms=244000,
        )


def test_resolver_uses_hot_cache_for_repeat_lookups() -> None:
    provider = FakeProvider()
    resolver = TrackMetadataResolver(
        providers={TrackSource.SPOTIFY: provider},
        cache=LayeredMetadataCache(
            ttl_seconds=3600,
            hot_cache=InMemoryMetadataCache(max_entries=8),
        ),
        client_factory=DummyAsyncClient,
        enricher=None,
    )

    first = asyncio.run(resolver.resolve("https://open.spotify.com/track/abc123"))
    second = asyncio.run(resolver.resolve("https://open.spotify.com/track/abc123"))

    assert first.title == "Midnight City"
    assert second.artist == "M83"
    assert provider.calls == 1


def test_resolver_uses_persistent_cache_before_calling_provider() -> None:
    engine = create_engine(
        "sqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    first_provider = FakeProvider()
    first_resolver = TrackMetadataResolver(
        providers={TrackSource.SPOTIFY: first_provider},
        cache=LayeredMetadataCache(
            ttl_seconds=3600,
            hot_cache=InMemoryMetadataCache(max_entries=8),
        ),
        client_factory=DummyAsyncClient,
        enricher=None,
    )

    with Session(engine) as db:
        asyncio.run(first_resolver.resolve("https://open.spotify.com/track/abc123", db=db))
        db.commit()

    second_provider = FakeProvider()
    second_resolver = TrackMetadataResolver(
        providers={TrackSource.SPOTIFY: second_provider},
        cache=LayeredMetadataCache(
            ttl_seconds=3600,
            hot_cache=InMemoryMetadataCache(max_entries=8),
        ),
        client_factory=DummyAsyncClient,
        enricher=None,
    )

    with session_local() as db:
        cached_track = asyncio.run(second_resolver.resolve("https://open.spotify.com/track/abc123", db=db))
        db.commit()

    assert cached_track.album == "Hurry Up, We're Dreaming"
    assert first_provider.calls == 1
    assert second_provider.calls == 0


def test_resolver_uses_shared_cache_before_calling_provider() -> None:
    shared_cache = SharedMetadataCache(
        store=CacheStore(backend=MemoryCacheBackend(), namespace="test"),
    )

    first_provider = FakeProvider()
    first_resolver = TrackMetadataResolver(
        providers={TrackSource.SPOTIFY: first_provider},
        cache=LayeredMetadataCache(
            ttl_seconds=3600,
            hot_cache=InMemoryMetadataCache(max_entries=8),
            shared_cache=shared_cache,
        ),
        client_factory=DummyAsyncClient,
        enricher=None,
    )
    asyncio.run(first_resolver.resolve("https://open.spotify.com/track/abc123"))

    second_provider = FakeProvider()
    second_resolver = TrackMetadataResolver(
        providers={TrackSource.SPOTIFY: second_provider},
        cache=LayeredMetadataCache(
            ttl_seconds=3600,
            hot_cache=InMemoryMetadataCache(max_entries=8),
            shared_cache=shared_cache,
        ),
        client_factory=DummyAsyncClient,
        enricher=None,
    )

    cached_track = asyncio.run(second_resolver.resolve("https://open.spotify.com/track/abc123"))

    assert cached_track.title == "Midnight City"
    assert first_provider.calls == 1
    assert second_provider.calls == 0
