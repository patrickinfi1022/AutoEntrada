import os
from urllib.parse import quote

import httpx


def _base_url(base_url: str | None = None) -> str:
    return (base_url or os.getenv("GO2RTC_API_URL", "http://go2rtc:1984")).rstrip("/")


def _timeout() -> httpx.Timeout:
    return httpx.Timeout(connect=3.0, read=15.0, write=15.0, pool=3.0)


def build_hikvision_rtsp_url(host: str, username: str, password: str, channel: int) -> str:
    host_for_url = f"[{host}]" if ":" in host else host
    user = quote(username, safe="")
    secret = quote(password, safe="")
    return f"rtsp://{user}:{secret}@{host_for_url}:554/Streaming/Channels/{channel}#transport=tcp#media=video"


async def add_rtsp_stream(stream_key: str, source_url: str, base_url: str | None = None) -> None:
    async with httpx.AsyncClient(timeout=_timeout(), trust_env=False) as client:
        response = await client.put(
            f"{_base_url(base_url)}/api/streams",
            params={"name": stream_key, "src": source_url},
        )
        response.raise_for_status()


async def remove_stream(stream_key: str, base_url: str | None = None) -> None:
    async with httpx.AsyncClient(timeout=_timeout(), trust_env=False) as client:
        response = await client.delete(
            f"{_base_url(base_url)}/api/streams",
            params={"src": stream_key},
        )
        if response.status_code not in (200, 204, 404):
            response.raise_for_status()


async def whep_offer(stream_key: str, sdp_offer: bytes, base_url: str | None = None) -> httpx.Response:
    async with httpx.AsyncClient(timeout=_timeout(), trust_env=False) as client:
        return await client.post(
            f"{_base_url(base_url)}/api/webrtc",
            params={"src": stream_key},
            content=sdp_offer,
            headers={"Content-Type": "application/sdp", "Accept": "application/sdp"},
        )


async def delete_whep_session(location: str) -> httpx.Response:
    async with httpx.AsyncClient(timeout=_timeout(), trust_env=False) as client:
        return await client.delete(location, headers={"Accept": "application/sdp"})
