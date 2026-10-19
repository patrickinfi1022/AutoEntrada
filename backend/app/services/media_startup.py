import logging

import httpx

from ..database import SessionLocal
from ..models.models import CameraStream, EdgeGateway
from .go2rtc_client import add_rtsp_stream, build_hikvision_rtsp_url
from .media_credentials import decrypt_camera_password

logger = logging.getLogger("autoentrada.media")


async def restore_camera_streams() -> None:
    """Recreate go2rtc's in-memory stream registry from encrypted MySQL records."""
    try:
        with SessionLocal() as db:
            cameras = db.query(CameraStream, EdgeGateway).outerjoin(
                EdgeGateway, CameraStream.gateway_id == EdgeGateway.id,
            ).all()
            sources = [
                (
                    camera.id,
                    camera.stream_key,
                    edge.media_api_url if edge else None,
                    build_hikvision_rtsp_url(
                        camera.host,
                        camera.rtsp_username,
                        decrypt_camera_password(camera.password_encrypted),
                        camera.channel,
                    ),
                )
                for camera, edge in cameras
            ]
    except Exception:
        logger.warning("No fue posible leer cámaras guardadas para restaurar go2rtc")
        return

    for camera_id, stream_key, base_url, source in sources:
        try:
            await add_rtsp_stream(stream_key, source, base_url)
        except httpx.HTTPError:
            logger.warning("No fue posible restaurar el stream de cámara %s", camera_id)
