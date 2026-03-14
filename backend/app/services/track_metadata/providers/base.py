from __future__ import annotations

from typing import Protocol

import httpx

from app.services.track_metadata.domain import MetadataLookup, ResolvedTrack


class MusicMetadataProvider(Protocol):
    source: str

    async def resolve(self, client: httpx.AsyncClient, lookup: MetadataLookup) -> ResolvedTrack:
        ...
