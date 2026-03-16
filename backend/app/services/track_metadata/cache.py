from __future__ import annotations

from collections import OrderedDict
from dataclasses import asdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import TrackMetadataCacheEntry
from app.services.shared_cache import CacheStore
from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


@dataclass
class MemoryCacheEntry:
    track: ResolvedTrack
    expires_at: datetime


class InMemoryMetadataCache:
    def __init__(self, *, max_entries: int, now_provider=utcnow) -> None:
        self.max_entries = max_entries
        self.now_provider = now_provider
        self._entries: OrderedDict[str, MemoryCacheEntry] = OrderedDict()
        self._lock = Lock()

    def get(self, cache_key: str) -> ResolvedTrack | None:
        now = self.now_provider()
        with self._lock:
            entry = self._entries.get(cache_key)
            if entry is None:
                return None
            if ensure_aware(entry.expires_at) <= now:
                self._entries.pop(cache_key, None)
                return None
            self._entries.move_to_end(cache_key)
            return entry.track.copy()

    def set(self, cache_key: str, track: ResolvedTrack, expires_at: datetime) -> None:
        with self._lock:
            self._entries[cache_key] = MemoryCacheEntry(track=track.copy(), expires_at=ensure_aware(expires_at))
            self._entries.move_to_end(cache_key)
            while len(self._entries) > self.max_entries:
                self._entries.popitem(last=False)


class SharedMetadataCache:
    def __init__(self, *, store: CacheStore, now_provider=utcnow) -> None:
        self.store = store
        self.now_provider = now_provider

    def get(self, cache_key: str) -> tuple[ResolvedTrack, datetime] | None:
        payload = self.store.get_json("track-metadata", cache_key)
        if payload is None:
            return None

        expires_at_raw = payload.get("expires_at")
        track_payload = payload.get("track")
        if not isinstance(expires_at_raw, str) or not isinstance(track_payload, dict):
            self.store.delete("track-metadata", cache_key)
            return None

        expires_at = ensure_aware(datetime.fromisoformat(expires_at_raw))
        if expires_at <= self.now_provider():
            self.store.delete("track-metadata", cache_key)
            return None

        return ResolvedTrack(**track_payload), expires_at

    def set(self, cache_key: str, track: ResolvedTrack, expires_at: datetime) -> None:
        normalized_expires_at = ensure_aware(expires_at)
        ttl_seconds = max(1, int((normalized_expires_at - self.now_provider()).total_seconds()))
        self.store.set_json(
            "track-metadata",
            cache_key,
            value={
                "expires_at": normalized_expires_at.isoformat(),
                "track": asdict(track),
            },
            ttl_seconds=ttl_seconds,
        )


class LayeredMetadataCache:
    def __init__(
        self,
        *,
        ttl_seconds: int,
        hot_cache: InMemoryMetadataCache,
        shared_cache: SharedMetadataCache | None = None,
        now_provider=utcnow,
    ) -> None:
        self.ttl_seconds = ttl_seconds
        self.hot_cache = hot_cache
        self.shared_cache = shared_cache
        self.now_provider = now_provider

    def get(self, lookup: MetadataLookup, db: Session | None = None) -> ResolvedTrack | None:
        hot_track = self.hot_cache.get(lookup.cache_key)
        if hot_track is not None:
            return hot_track

        if self.shared_cache is not None:
            shared_hit = self.shared_cache.get(lookup.cache_key)
            if shared_hit is not None:
                track, expires_at = shared_hit
                self.hot_cache.set(lookup.cache_key, track, expires_at)
                return track

        if db is None:
            return None

        entry = db.scalar(
            select(TrackMetadataCacheEntry).where(TrackMetadataCacheEntry.cache_key == lookup.cache_key)
        )
        if entry is None:
            return None

        now = self.now_provider()
        if ensure_aware(entry.expires_at) <= now:
            return None

        entry.hit_count = (entry.hit_count or 0) + 1
        entry.last_accessed_at = now
        db.add(entry)
        db.flush()

        track = _entry_to_track(entry)
        self.hot_cache.set(lookup.cache_key, track, ensure_aware(entry.expires_at))
        if self.shared_cache is not None:
            self.shared_cache.set(lookup.cache_key, track, ensure_aware(entry.expires_at))
        return track

    def set(self, lookup: MetadataLookup, track: ResolvedTrack, db: Session | None = None) -> None:
        now = self.now_provider()
        expires_at = now + timedelta(seconds=self.ttl_seconds)
        self.hot_cache.set(lookup.cache_key, track, expires_at)
        if self.shared_cache is not None:
            self.shared_cache.set(lookup.cache_key, track, expires_at)

        if db is None:
            return

        db.execute(
            delete(TrackMetadataCacheEntry).where(TrackMetadataCacheEntry.expires_at <= now)
        )
        entry = db.scalar(
            select(TrackMetadataCacheEntry).where(TrackMetadataCacheEntry.cache_key == lookup.cache_key)
        )
        if entry is None:
            entry = TrackMetadataCacheEntry(
                cache_key=lookup.cache_key,
                lookup_url=lookup.canonical_url,
                source=track.source,
            )

        entry.lookup_url = lookup.canonical_url
        entry.source = track.source
        entry.source_url = track.source_url
        entry.source_identifier = track.source_identifier
        entry.title = track.title
        entry.artist = track.artist
        entry.album = track.album
        entry.genre = track.genre
        entry.album_art_url = track.album_art_url
        entry.duration_ms = track.duration_ms
        entry.provider_name = lookup.source
        entry.refreshed_at = now
        entry.expires_at = expires_at
        entry.last_accessed_at = now
        entry.hit_count = max(entry.hit_count or 0, 0)
        db.add(entry)
        db.flush()


def _entry_to_track(entry: TrackMetadataCacheEntry) -> ResolvedTrack:
    return ResolvedTrack(
        source=entry.source,
        source_url=entry.source_url,
        source_identifier=entry.source_identifier,
        title=entry.title,
        artist=entry.artist,
        album=entry.album,
        genre=entry.genre,
        album_art_url=entry.album_art_url,
        duration_ms=entry.duration_ms,
    )
