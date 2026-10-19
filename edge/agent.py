"""Small on-site agent: report gateway health to the SaaS control plane."""
import asyncio
import logging
import os
import time

import httpx

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("autoentrada.edge")

API_BASE_URL = os.environ["EDGE_API_BASE_URL"].rstrip("/")
EDGE_TOKEN = os.environ["EDGE_TOKEN"]
MEDIA_API_URL = os.getenv("EDGE_GO2RTC_API_URL", "http://go2rtc:1984").rstrip("/")
HEARTBEAT_SECONDS = max(10, int(os.getenv("EDGE_HEARTBEAT_SECONDS", "30")))


async def read_media_health(client: httpx.AsyncClient) -> tuple[bool, int, str | None]:
    try:
        info_response = await client.get(f"{MEDIA_API_URL}/api", timeout=4.0)
        info_response.raise_for_status()
        info = info_response.json()
        streams_response = await client.get(f"{MEDIA_API_URL}/api/streams", timeout=4.0)
        streams_response.raise_for_status()
        streams = streams_response.json()
        return True, len(streams) if isinstance(streams, dict) else 0, str(info.get("version") or "")[:40] or None
    except (httpx.HTTPError, ValueError):
        return False, 0, None


async def run() -> None:
    headers = {"Authorization": f"Bearer {EDGE_TOKEN}"}
    async with httpx.AsyncClient(timeout=8.0, headers=headers, follow_redirects=False) as client:
        while True:
            media_available, configured_streams, media_version = await read_media_health(client)
            try:
                response = await client.post(
                    f"{API_BASE_URL}/api/edge/heartbeat",
                    json={
                        "media_available": media_available,
                        "configured_streams": configured_streams,
                        "media_version": media_version,
                    },
                )
                response.raise_for_status()
                logger.info("Heartbeat enviado; medios=%s; streams=%s", "disponibles" if media_available else "no disponibles", configured_streams)
            except httpx.HTTPError as exc:
                # Never log the Authorization header or camera source URLs.
                logger.warning("No se pudo enviar heartbeat al SaaS (%s)", type(exc).__name__)
            await asyncio.sleep(HEARTBEAT_SECONDS)


if __name__ == "__main__":
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
