from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from threading import Lock
from typing import Callable, Protocol

from app.config import get_settings
from app.services.shared_cache import CacheStore, get_cache_store


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int | None = None


@dataclass
class RateLimitEntry:
    count: int
    reset_at: datetime


class RateLimiter(Protocol):
    def check(self, key: str) -> RateLimitDecision: ...

    def record_failure(self, key: str) -> None: ...

    def record_attempt(self, key: str) -> None: ...

    def clear(self, key: str) -> None: ...


class FixedWindowRateLimiter:
    def __init__(
        self,
        *,
        max_attempts: int,
        window_seconds: int,
        now_provider: Callable[[], datetime] = utcnow,
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.now_provider = now_provider
        self._entries: dict[str, RateLimitEntry] = {}
        self._lock = Lock()

    def check(self, key: str) -> RateLimitDecision:
        now = self.now_provider()
        with self._lock:
            entry = self._current_entry(key, now)
            if entry is None or entry.count < self.max_attempts:
                return RateLimitDecision(allowed=True)

            retry_after = max(1, int((entry.reset_at - now).total_seconds()))
            return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

    def record_failure(self, key: str) -> None:
        now = self.now_provider()
        with self._lock:
            entry = self._current_entry(key, now)
            if entry is None:
                entry = RateLimitEntry(count=0, reset_at=now + timedelta(seconds=self.window_seconds))
                self._entries[key] = entry
            entry.count += 1

    def record_attempt(self, key: str) -> None:
        self.record_failure(key)

    def clear(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def _current_entry(self, key: str, now: datetime) -> RateLimitEntry | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if entry.reset_at <= now:
            self._entries.pop(key, None)
            return None
        return entry


class SharedFixedWindowRateLimiter:
    def __init__(
        self,
        *,
        max_attempts: int,
        window_seconds: int,
        store: CacheStore,
        namespace: str,
    ) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.store = store
        self.namespace = namespace

    def check(self, key: str) -> RateLimitDecision:
        count = self.store.get_int(self.namespace, key)
        if count is None or count < self.max_attempts:
            return RateLimitDecision(allowed=True)

        retry_after = self.store.ttl(self.namespace, key) or self.window_seconds
        return RateLimitDecision(allowed=False, retry_after_seconds=max(1, retry_after))

    def record_failure(self, key: str) -> None:
        current_count = self.store.increment(self.namespace, key)
        if current_count == 1:
            self.store.expire(self.namespace, key, ttl_seconds=self.window_seconds)

    def record_attempt(self, key: str) -> None:
        self.record_failure(key)

    def clear(self, key: str) -> None:
        self.store.delete(self.namespace, key)


@lru_cache
def get_auth_rate_limiter() -> RateLimiter:
    settings = get_settings()
    store = get_cache_store()
    if settings.redis_url:
        return SharedFixedWindowRateLimiter(
            max_attempts=settings.auth_rate_limit_max_attempts,
            window_seconds=settings.auth_rate_limit_window_seconds,
            store=store,
            namespace="rate-limit:auth",
        )
    return FixedWindowRateLimiter(
        max_attempts=settings.auth_rate_limit_max_attempts,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )


@lru_cache
def get_friend_lookup_rate_limiter() -> RateLimiter:
    settings = get_settings()
    store = get_cache_store()
    if settings.redis_url:
        return SharedFixedWindowRateLimiter(
            max_attempts=settings.friend_lookup_rate_limit_max_attempts,
            window_seconds=settings.friend_lookup_rate_limit_window_seconds,
            store=store,
            namespace="rate-limit:friend-lookup",
        )
    return FixedWindowRateLimiter(
        max_attempts=settings.friend_lookup_rate_limit_max_attempts,
        window_seconds=settings.friend_lookup_rate_limit_window_seconds,
    )
