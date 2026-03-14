from __future__ import annotations

from sqlalchemy.orm import Session

from app.services import track_metadata as track_metadata_service


ResolvedTrack = track_metadata_service.ResolvedTrack
SOURCE_LABELS = track_metadata_service.SOURCE_LABELS
TrackSource = track_metadata_service.TrackSource
detect_source = track_metadata_service.detect_source
ensure_supported_url = track_metadata_service.ensure_supported_url
extract_source_identifier = track_metadata_service.extract_source_identifier
normalize_text = track_metadata_service.normalize_text
parse_video_title = track_metadata_service.parse_video_title


__all__ = [
    "ResolvedTrack",
    "SOURCE_LABELS",
    "TrackSource",
    "detect_source",
    "ensure_supported_url",
    "extract_source_identifier",
    "normalize_text",
    "parse_video_title",
    "resolve_track",
]


async def resolve_track(url: str, db: Session | None = None) -> ResolvedTrack:
    return await track_metadata_service.get_track_metadata_resolver().resolve(url, db=db)
