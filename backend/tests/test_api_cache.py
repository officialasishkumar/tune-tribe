from app.schemas import AnalyticsResponse, GlobalStatsResponse, StatPoint
from app.services.api_cache import ApiResponseCache
from app.services.shared_cache import CacheStore, MemoryCacheBackend


def test_api_response_cache_invalidates_versioned_group_analytics() -> None:
    cache = ApiResponseCache(
        store=CacheStore(backend=MemoryCacheBackend(), namespace="test"),
        analytics_ttl_seconds=120,
        global_stats_ttl_seconds=300,
    )
    response = AnalyticsResponse(
        stats=[StatPoint(label="Total tracks", value="3")],
        genre_distribution=[],
        source_loyalty=[],
        weekly_activity=[],
        monthly_trend=[],
        member_leaderboard=[],
        top_tracks=[],
    )

    cache.set_group_analytics(group_id=42, window="30d", response=response)

    cached_response = cache.get_group_analytics(group_id=42, window="30d")
    assert cached_response is not None
    assert cached_response.stats[0].value == "3"

    cache.invalidate_group_analytics(42)
    assert cache.get_group_analytics(group_id=42, window="30d") is None


def test_api_response_cache_caches_and_invalidates_global_stats() -> None:
    cache = ApiResponseCache(
        store=CacheStore(backend=MemoryCacheBackend(), namespace="test"),
        analytics_ttl_seconds=120,
        global_stats_ttl_seconds=300,
    )
    response = GlobalStatsResponse(groups_created=4, tracks_shared=18, active_members=7)

    cache.set_global_stats(response)

    cached_response = cache.get_global_stats()
    assert cached_response is not None
    assert cached_response.tracks_shared == 18

    cache.invalidate_global_stats()
    assert cache.get_global_stats() is None
