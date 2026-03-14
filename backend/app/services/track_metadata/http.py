from __future__ import annotations

from urllib.parse import urljoin

import httpx
from fastapi import HTTPException, status

from app.config import get_settings
from app.services.track_metadata.parsers import ensure_supported_url


async def fetch_provider_page(client: httpx.AsyncClient, url: str) -> tuple[httpx.Response, str]:
    current_url, _ = ensure_supported_url(url)
    max_redirects = get_settings().metadata_max_redirects

    for _ in range(max_redirects + 1):
        response = await client.get(current_url, follow_redirects=False)
        if response.status_code not in {301, 302, 303, 307, 308}:
            response.raise_for_status()
            return response, current_url

        location = response.headers.get("location")
        if not location:
            break

        next_url = urljoin(current_url, location)
        current_url, _ = ensure_supported_url(next_url)

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="The music provider returned too many redirects. Please try another link.",
    )
