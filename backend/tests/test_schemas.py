import pytest
from pydantic import ValidationError

from app.schemas import GroupCreateRequest, LoginRequest, ProfileUpdateRequest, RegisterRequest, TrackCreateRequest


def test_register_request_accepts_frontend_camel_case_payload() -> None:
    payload = RegisterRequest.model_validate(
        {
            "email": "alex@example.com",
            "username": "Alex_User",
            "displayName": "Alex Rivera",
            "password": "TuneTribe!123",
            "favoriteGenre": "Electronic",
            "favoriteArtist": "Bonobo",
        }
    )

    assert payload.username == "alex_user"
    assert payload.display_name == "Alex Rivera"
    assert payload.favorite_genre == "Electronic"
    assert payload.favorite_artist == "Bonobo"


def test_group_and_profile_requests_accept_frontend_camel_case_payloads() -> None:
    group_payload = GroupCreateRequest.model_validate({"name": "Night Drive", "memberIds": [1, 2, 3]})
    profile_payload = ProfileUpdateRequest.model_validate(
        {
            "displayName": "Alex Rivera",
            "bio": "Updated bio",
            "favoriteGenre": "Ambient",
            "favoriteArtist": "Burial",
            "avatarUrl": "https://example.com/avatar.png",
        }
    )

    assert group_payload.member_ids == [1, 2, 3]
    assert profile_payload.display_name == "Alex Rivera"
    assert profile_payload.avatar_url == "https://example.com/avatar.png"


def test_login_request_accepts_identifier_or_email_payload() -> None:
    identifier_payload = LoginRequest.model_validate(
        {
            "identifier": " Alex_User ",
            "password": "TuneTribe!123",
        }
    )
    email_payload = LoginRequest.model_validate(
        {
            "email": "alex@example.com",
            "password": "TuneTribe!123",
        }
    )

    assert identifier_payload.identifier == "Alex_User"
    assert email_payload.identifier == "alex@example.com"


def test_register_request_rejects_weak_passwords() -> None:
    with pytest.raises(ValidationError, match="lowercase"):
        RegisterRequest.model_validate(
            {
                "email": "alex@example.com",
                "username": "alex_user",
                "displayName": "Alex Rivera",
                "password": "ALLCAPS123",
            }
        )


def test_profile_and_track_urls_reject_unsafe_schemes() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        ProfileUpdateRequest.model_validate(
            {
                "displayName": "Alex Rivera",
                "bio": "Updated bio",
                "avatarUrl": "http://example.com/avatar.png",
            }
        )

    with pytest.raises(ValidationError, match="HTTPS"):
        TrackCreateRequest.model_validate(
            {
                "url": "http://open.spotify.com/track/example",
            }
        )
