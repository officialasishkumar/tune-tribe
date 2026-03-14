from __future__ import annotations

import re
from urllib.parse import urlparse


LOCAL_HTTP_HOSTS = {"localhost", "127.0.0.1"}


def normalize_required_text(value: str, *, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} cannot be blank.")
    _ensure_no_control_characters(cleaned, field_name=field_name)
    return cleaned


def normalize_optional_text(value: str | None, *, field_name: str) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    _ensure_no_control_characters(cleaned, field_name=field_name)
    return cleaned


def normalize_bio_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        return ""

    _ensure_no_control_characters(cleaned, field_name="Bio")
    return cleaned


def validate_password_strength(password: str) -> str:
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must include at least one lowercase letter.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must include at least one uppercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must include at least one number.")
    return password


def validate_profile_image_url(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    parsed = _parse_http_url(cleaned, field_name="Avatar URL")
    if parsed.scheme != "https" and parsed.hostname not in LOCAL_HTTP_HOSTS:
        raise ValueError("Avatar URL must use HTTPS unless it targets localhost.")
    return cleaned


def validate_music_url(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Track URL is required.")

    parsed = _parse_http_url(cleaned, field_name="Track URL")
    if parsed.scheme != "https":
        raise ValueError("Track URL must use HTTPS.")
    return cleaned


def _parse_http_url(value: str, *, field_name: str):
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"{field_name} must be a valid HTTP or HTTPS URL.")
    if parsed.username or parsed.password:
        raise ValueError(f"{field_name} must not include credentials.")
    if parsed.fragment:
        raise ValueError(f"{field_name} must not include a URL fragment.")
    return parsed


def _ensure_no_control_characters(value: str, *, field_name: str) -> None:
    if any(ord(character) < 32 for character in value):
        raise ValueError(f"{field_name} contains unsupported control characters.")
