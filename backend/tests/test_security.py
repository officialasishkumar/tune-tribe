from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.config import get_settings
from app.security import create_access_token, decode_access_token


def test_access_token_round_trip_includes_expected_claims() -> None:
    payload = decode_access_token(create_access_token("123"))

    assert payload["sub"] == "123"
    assert payload["type"] == "access"
    assert payload["iss"] == get_settings().token_issuer


def test_decode_access_token_rejects_wrong_issuer() -> None:
    settings = get_settings()
    issued_at = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": "1",
            "type": "access",
            "iss": "different-issuer",
            "iat": issued_at,
            "nbf": issued_at,
            "exp": issued_at + timedelta(minutes=5),
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )

    with pytest.raises(HTTPException, match="Invalid or expired authentication token"):
        decode_access_token(token)
