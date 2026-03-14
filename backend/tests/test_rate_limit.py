from datetime import datetime, timedelta, timezone

from app.services.rate_limit import FixedWindowRateLimiter


def test_rate_limiter_blocks_after_max_attempts_and_resets() -> None:
    current_time = datetime(2026, 3, 14, tzinfo=timezone.utc)

    def now_provider() -> datetime:
        return current_time

    limiter = FixedWindowRateLimiter(max_attempts=2, window_seconds=60, now_provider=now_provider)

    assert limiter.check("login:alex").allowed is True

    limiter.record_failure("login:alex")
    limiter.record_failure("login:alex")

    blocked = limiter.check("login:alex")
    assert blocked.allowed is False
    assert blocked.retry_after_seconds is not None

    current_time += timedelta(seconds=61)
    assert limiter.check("login:alex").allowed is True
