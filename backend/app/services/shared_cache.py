from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from threading import Lock
from typing import Any, Protocol

from redis import Redis
from redis.exceptions import RedisError

from app.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CacheBackend(Protocol):
    def get(self, key: str) -> str | None: ...

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None: ...

    def delete(self, key: str) -> None: ...

    def incr(self, key: str) -> int: ...

    def expire(self, key: str, ttl_seconds: int) -> bool: ...

    def ttl(self, key: str) -> int | None: ...


@dataclass
class MemoryCacheEntry:
    value: str
    expires_at: datetime | None


class MemoryCacheBackend:
    def __init__(self, *, now_provider=utcnow) -> None:
        self.now_provider = now_provider
        self._entries: dict[str, MemoryCacheEntry] = {}
        self._lock = Lock()

    def get(self, key: str) -> str | None:
        with self._lock:
            entry = self._current_entry(key)
            return entry.value if entry is not None else None

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        expires_at = None
        if ttl_seconds is not None:
            expires_at = self.now_provider() + timedelta(seconds=max(1, ttl_seconds))
        with self._lock:
            self._entries[key] = MemoryCacheEntry(value=value, expires_at=expires_at)

    def delete(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def incr(self, key: str) -> int:
        with self._lock:
            entry = self._current_entry(key)
            current_value = int(entry.value) if entry is not None else 0
            next_value = current_value + 1
            expires_at = entry.expires_at if entry is not None else None
            self._entries[key] = MemoryCacheEntry(value=str(next_value), expires_at=expires_at)
            return next_value

    def expire(self, key: str, ttl_seconds: int) -> bool:
        with self._lock:
            entry = self._current_entry(key)
            if entry is None:
                return False
            entry.expires_at = self.now_provider() + timedelta(seconds=max(1, ttl_seconds))
            return True

    def ttl(self, key: str) -> int | None:
        with self._lock:
            entry = self._current_entry(key)
            if entry is None or entry.expires_at is None:
                return None
            remaining = int((entry.expires_at - self.now_provider()).total_seconds())
            return max(0, remaining)

    def _current_entry(self, key: str) -> MemoryCacheEntry | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if entry.expires_at is not None and entry.expires_at <= self.now_provider():
            self._entries.pop(key, None)
            return None
        return entry


class RedisCacheBackend:
    def __init__(
        self,
        *,
        url: str,
        connect_timeout_seconds: float,
        socket_timeout_seconds: float,
    ) -> None:
        self.client = Redis.from_url(
            url,
            decode_responses=True,
            health_check_interval=30,
            socket_connect_timeout=connect_timeout_seconds,
            socket_timeout=socket_timeout_seconds,
        )

    def get(self, key: str) -> str | None:
        return self.client.get(key)

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        self.client.set(name=key, value=value, ex=ttl_seconds)

    def delete(self, key: str) -> None:
        self.client.delete(key)

    def incr(self, key: str) -> int:
        return int(self.client.incr(key))

    def expire(self, key: str, ttl_seconds: int) -> bool:
        return bool(self.client.expire(key, ttl_seconds))

    def ttl(self, key: str) -> int | None:
        ttl = int(self.client.ttl(key))
        if ttl < 0:
            return None
        return ttl


class ResilientCacheBackend:
    def __init__(self, *, primary: CacheBackend, fallback: CacheBackend) -> None:
        self.primary = primary
        self.fallback = fallback

    def get(self, key: str) -> str | None:
        try:
            return self.primary.get(key)
        except RedisError:
            return self.fallback.get(key)

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        try:
            self.primary.set(key, value, ttl_seconds=ttl_seconds)
        except RedisError:
            self.fallback.set(key, value, ttl_seconds=ttl_seconds)

    def delete(self, key: str) -> None:
        try:
            self.primary.delete(key)
        except RedisError:
            self.fallback.delete(key)

    def incr(self, key: str) -> int:
        try:
            return self.primary.incr(key)
        except RedisError:
            return self.fallback.incr(key)

    def expire(self, key: str, ttl_seconds: int) -> bool:
        try:
            return self.primary.expire(key, ttl_seconds)
        except RedisError:
            return self.fallback.expire(key, ttl_seconds)

    def ttl(self, key: str) -> int | None:
        try:
            return self.primary.ttl(key)
        except RedisError:
            return self.fallback.ttl(key)


class CacheStore:
    def __init__(self, *, backend: CacheBackend, namespace: str) -> None:
        self.backend = backend
        self.namespace = namespace.strip(":")

    def get_text(self, *parts: object) -> str | None:
        return self.backend.get(self._key(*parts))

    def set_text(self, *parts: object, value: str, ttl_seconds: int | None = None) -> None:
        self.backend.set(self._key(*parts), value, ttl_seconds=ttl_seconds)

    def get_int(self, *parts: object) -> int | None:
        value = self.get_text(*parts)
        if value is None:
            return None
        return int(value)

    def get_json(self, *parts: object) -> Any | None:
        value = self.get_text(*parts)
        if value is None:
            return None
        return json.loads(value)

    def set_json(self, *parts: object, value: Any, ttl_seconds: int | None = None) -> None:
        payload = json.dumps(value, separators=(",", ":"), sort_keys=True)
        self.set_text(*parts, value=payload, ttl_seconds=ttl_seconds)

    def delete(self, *parts: object) -> None:
        self.backend.delete(self._key(*parts))

    def increment(self, *parts: object) -> int:
        return self.backend.incr(self._key(*parts))

    def expire(self, *parts: object, ttl_seconds: int) -> bool:
        return self.backend.expire(self._key(*parts), ttl_seconds)

    def ttl(self, *parts: object) -> int | None:
        return self.backend.ttl(self._key(*parts))

    def _key(self, *parts: object) -> str:
        joined = ":".join(str(part).strip(":") for part in parts)
        return f"{self.namespace}:{joined}" if joined else self.namespace


@lru_cache
def get_cache_store() -> CacheStore:
    settings = get_settings()
    if settings.redis_url:
        backend: CacheBackend = ResilientCacheBackend(
            primary=RedisCacheBackend(
                url=settings.redis_url,
                connect_timeout_seconds=settings.redis_connect_timeout_seconds,
                socket_timeout_seconds=settings.redis_socket_timeout_seconds,
            ),
            fallback=MemoryCacheBackend(),
        )
    else:
        backend = MemoryCacheBackend()

    return CacheStore(backend=backend, namespace=settings.cache_namespace)
