from __future__ import annotations

from dataclasses import replace
from difflib import SequenceMatcher
from typing import Any

import httpx

from app.services.track_metadata.domain import ResolvedTrack, normalize_text


class ItunesMetadataEnricher:
    async def enrich(self, client: httpx.AsyncClient, track: ResolvedTrack) -> ResolvedTrack:
        query = f"{track.title} {track.artist}".strip()
        if not query:
            return track

        response = await client.get(
            "https://itunes.apple.com/search",
            params={"term": query, "entity": "song", "limit": 10},
        )
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results", [])
        if not results:
            return track

        best = max(results, key=lambda item: _score_itunes_result(item, track.title, track.artist))
        return replace(
            track,
            title=best.get("trackName", track.title),
            artist=best.get("artistName", track.artist),
            album=best.get("collectionName", track.album),
            genre=best.get("primaryGenreName", track.genre or "Unknown"),
            album_art_url=(best.get("artworkUrl100", "") or "").replace("100x100", "400x400") or track.album_art_url,
            duration_ms=best.get("trackTimeMillis", track.duration_ms),
        )


def _score_itunes_result(item: dict[str, Any], title: str, artist: str) -> float:
    track_ratio = SequenceMatcher(None, normalize_text(item.get("trackName", "")), normalize_text(title)).ratio()
    artist_ratio = SequenceMatcher(None, normalize_text(item.get("artistName", "")), normalize_text(artist)).ratio()
    return track_ratio * 2.0 + artist_ratio
