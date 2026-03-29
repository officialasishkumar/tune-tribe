from __future__ import annotations

from functools import lru_cache

from app.config import get_settings
from app.schemas import AnalyticsResponse, GlobalStatsResponse
from app.services.shared_cache import CacheStore, get_cache_store


class ApiResponseCache:
    def __init__(
        self,
        *,
        store: CacheStore,
        analytics_ttl_seconds: int,
        global_stats_ttl_seconds: int,
    ) -> None:
        self.store = store
        self.analytics_ttl_seconds = analytics_ttl_seconds
        self.global_stats_ttl_seconds = global_stats_ttl_seconds

    def get_global_stats(self) -> GlobalStatsResponse | None:
        payload = self.store.get_json("response-cache", "stats", "global")
        if payload is None:
            return None
        return GlobalStatsResponse.model_validate(payload)

    def set_global_stats(self, response: GlobalStatsResponse) -> None:
        self.store.set_json(
            "response-cache",
            "stats",
            "global",
            value=response.model_dump(mode="json"),
            ttl_seconds=self.global_stats_ttl_seconds,
        )

    def invalidate_global_stats(self) -> None:
        self.store.delete("response-cache", "stats", "global")

    def get_group_analytics(self, *, group_id: int, window: str) -> AnalyticsResponse | None:
        payload = self.store.get_json(
            "response-cache",
            "analytics",
            "group",
            group_id,
            self._group_version(group_id),
            window,
        )
        if payload is None:
            return None
        return AnalyticsResponse.model_validate(payload)

    def set_group_analytics(self, *, group_id: int, window: str, response: AnalyticsResponse) -> None:
        self.store.set_json(
            "response-cache",
            "analytics",
            "group",
            group_id,
            self._group_version(group_id),
            window,
            value=response.model_dump(mode="json"),
            ttl_seconds=self.analytics_ttl_seconds,
        )

    def invalidate_group_analytics(self, group_id: int) -> None:
        self.store.increment("response-cache", "analytics-version", "group", group_id)

    def get_personal_analytics(self, *, user_id: int, window: str) -> AnalyticsResponse | None:
        payload = self.store.get_json(
            "response-cache",
            "analytics",
            "user",
            user_id,
            self._user_version(user_id),
            window,
        )
        if payload is None:
            return None
        return AnalyticsResponse.model_validate(payload)

    def set_personal_analytics(self, *, user_id: int, window: str, response: AnalyticsResponse) -> None:
        self.store.set_json(
            "response-cache",
            "analytics",
            "user",
            user_id,
            self._user_version(user_id),
            window,
            value=response.model_dump(mode="json"),
            ttl_seconds=self.analytics_ttl_seconds,
        )

    def invalidate_personal_analytics(self, user_id: int) -> None:
        self.store.increment("response-cache", "analytics-version", "user", user_id)

    def _group_version(self, group_id: int) -> int:
        return self.store.get_int("response-cache", "analytics-version", "group", group_id) or 0

    def _user_version(self, user_id: int) -> int:
        return self.store.get_int("response-cache", "analytics-version", "user", user_id) or 0


@lru_cache
def get_api_response_cache() -> ApiResponseCache:
    settings = get_settings()
    return ApiResponseCache(
        store=get_cache_store(),
        analytics_ttl_seconds=settings.analytics_cache_ttl_seconds,
        global_stats_ttl_seconds=settings.global_stats_cache_ttl_seconds,
    )
