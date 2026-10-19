import ipaddress
import os
from datetime import datetime, timedelta
from urllib.parse import urljoin
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import Identity, get_identity
from ..database import get_db
from ..models.models import CameraStream, EdgeGateway, ParkingSite, SiteMembership, WhepSession
from ..services.go2rtc_client import add_rtsp_stream, build_hikvision_rtsp_url, delete_whep_session, remove_stream, whep_offer
from ..services.media_credentials import encrypt_camera_password

router = APIRouter(prefix="/api/cameras", tags=["Cámaras WebRTC"])
MAX_SDP_BYTES = 128 * 1024
WHEP_SESSION_TTL_HOURS = 8


class CameraCreate(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    host: str = Field(min_length=7, max_length=45, description="Dirección IPv4/IPv6 privada del DVR")
    rtsp_username: str = Field(min_length=1, max_length=100)
    rtsp_password: str = Field(min_length=1, max_length=200)
    channel: int = Field(default=101, ge=101, le=999)
    site_id: str | None = None
    gateway_id: str | None = None


def _private_ip(value: str) -> str:
    try:
        address = ipaddress.ip_address(value)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="El host debe ser una dirección IP literal del DVR") from exc
    if not address.is_private or address.is_loopback or address.is_link_local or address.is_multicast:
        raise HTTPException(status_code=422, detail="El DVR debe estar en una red privada configurada para el servicio")
    return address.compressed


def _tenant_camera(camera_id: str, identity: Identity, db: Session) -> CameraStream:
    camera = db.query(CameraStream).filter(
        CameraStream.id == camera_id,
        CameraStream.tenant_id == identity.tenant_id,
    ).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    if identity.role != "Admin":
        if identity.role != "Seguridad" or not camera.site_id:
            raise HTTPException(status_code=403, detail="Este perfil no puede ver cámaras")
        membership = db.query(SiteMembership.id).filter(
            SiteMembership.site_id == camera.site_id,
            SiteMembership.tenant_id == identity.tenant_id,
            SiteMembership.subject == identity.subject,
            SiteMembership.role == identity.role,
        ).first()
        if not membership:
            raise HTTPException(status_code=403, detail="No tienes acceso al estacionamiento de esta cámara")
    return camera


@router.get("")
def list_cameras(identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    query = db.query(CameraStream).filter(CameraStream.tenant_id == identity.tenant_id)
    if identity.role == "Seguridad":
        query = query.join(SiteMembership, SiteMembership.site_id == CameraStream.site_id).filter(
            SiteMembership.tenant_id == identity.tenant_id,
            SiteMembership.subject == identity.subject,
            SiteMembership.role == "Seguridad",
        )
    elif identity.role != "Admin":
        return []
    cameras = query.order_by(CameraStream.created_at.desc()).all()
    return [{"id": camera.id, "label": camera.label, "channel": camera.channel, "site_id": camera.site_id, "gateway_id": camera.gateway_id, "created_at": camera.created_at} for camera in cameras]


@router.post("", status_code=201)
async def create_camera(payload: CameraCreate, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede registrar cámaras")

    host = _private_ip(payload.host)
    edge = None
    if payload.gateway_id:
        if not payload.site_id:
            raise HTTPException(status_code=422, detail="Selecciona el estacionamiento del gateway")
        site = db.query(ParkingSite).filter(
            ParkingSite.id == payload.site_id,
            ParkingSite.tenant_id == identity.tenant_id,
        ).first()
        edge = db.query(EdgeGateway).filter(
            EdgeGateway.id == payload.gateway_id,
            EdgeGateway.site_id == payload.site_id,
            EdgeGateway.tenant_id == identity.tenant_id,
        ).first()
        if not site or not edge:
            raise HTTPException(status_code=404, detail="Estacionamiento o gateway no encontrado")
        if edge.status != "online" or not edge.last_seen_at or edge.last_seen_at < datetime.utcnow() - timedelta(seconds=90):
            raise HTTPException(status_code=409, detail="El gateway está desconectado o el servicio de medios no está listo")
    elif payload.site_id:
        raise HTTPException(status_code=422, detail="Asigna también un gateway del estacionamiento")
    if any(ch in payload.rtsp_username + payload.rtsp_password for ch in "\r\n"):
        raise HTTPException(status_code=422, detail="Credenciales RTSP inválidas")

    camera_id = str(uuid4())
    stream_key = f"t{identity.tenant_id[:10]}_c{camera_id.replace('-', '')}"
    source_url = build_hikvision_rtsp_url(host, payload.rtsp_username, payload.rtsp_password, payload.channel)

    record = CameraStream(
        id=camera_id,
        tenant_id=identity.tenant_id,
        site_id=payload.site_id,
        gateway_id=payload.gateway_id,
        stream_key=stream_key,
        label=payload.label.strip(),
        host=host,
        rtsp_username=payload.rtsp_username,
        password_encrypted=encrypt_camera_password(payload.rtsp_password),
        channel=payload.channel,
    )
    try:
        await add_rtsp_stream(stream_key, source_url, edge.media_api_url if edge else None)
        db.add(record)
        db.commit()
    except httpx.HTTPError as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail="No fue posible registrar el flujo en el servidor de medios") from exc
    except Exception:
        db.rollback()
        try:
            await remove_stream(stream_key, edge.media_api_url if edge else None)
        except httpx.HTTPError:
            pass
        raise

    return {"id": camera_id, "label": record.label, "channel": record.channel, "site_id": record.site_id, "gateway_id": record.gateway_id, "created_at": record.created_at}


@router.delete("/{camera_id}", status_code=204)
async def delete_camera(camera_id: str, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede eliminar cámaras")
    camera = _tenant_camera(camera_id, identity, db)
    try:
        edge = db.query(EdgeGateway).filter(EdgeGateway.id == camera.gateway_id).first() if camera.gateway_id else None
        await remove_stream(camera.stream_key, edge.media_api_url if edge else None)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="No fue posible retirar el flujo del servidor de medios") from exc
    db.query(WhepSession).filter(WhepSession.camera_id == camera.id, WhepSession.tenant_id == identity.tenant_id).delete(synchronize_session=False)
    db.delete(camera)
    db.commit()
    return Response(status_code=204)


@router.post("/{camera_id}/whep")
async def create_whep_session(camera_id: str, request: Request, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    camera = _tenant_camera(camera_id, identity, db)
    edge = db.query(EdgeGateway).filter(EdgeGateway.id == camera.gateway_id).first() if camera.gateway_id else None
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type != "application/sdp":
        raise HTTPException(status_code=415, detail="La señalización requiere Content-Type: application/sdp")
    offer = await request.body()
    if not offer or len(offer) > MAX_SDP_BYTES:
        raise HTTPException(status_code=413, detail="La oferta SDP está vacía o excede el tamaño permitido")

    try:
        upstream = await whep_offer(camera.stream_key, offer, edge.media_api_url if edge else None)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="El servidor WebRTC no está disponible") from exc

    if upstream.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="El servidor de medios rechazó la conexión WebRTC")

    upstream_location = upstream.headers.get("location")
    headers = {"Content-Type": upstream.headers.get("content-type", "application/sdp")}
    if upstream.status_code == 201:
        if not upstream_location:
            raise HTTPException(status_code=502, detail="go2rtc no devolvió la ubicación de la sesión WHEP")
        upstream_base = (edge.media_api_url if edge else os.getenv("GO2RTC_API_URL", "http://go2rtc:1984")).rstrip("/") + "/"
        upstream_location = urljoin(upstream_base, upstream_location)
        session_id = str(uuid4())
        session = WhepSession(
            id=session_id,
            tenant_id=identity.tenant_id,
            camera_id=camera.id,
            upstream_location=upstream_location,
            expires_at=datetime.utcnow() + timedelta(hours=WHEP_SESSION_TTL_HOURS),
        )
        db.add(session)
        db.commit()
        headers["Location"] = f"/api/cameras/{camera.id}/whep/{session_id}"

    return Response(content=upstream.content, status_code=upstream.status_code, headers=headers)


@router.delete("/{camera_id}/whep/{session_id}", status_code=204)
async def close_whep_session(camera_id: str, session_id: str, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    camera = _tenant_camera(camera_id, identity, db)
    session = db.query(WhepSession).filter(
        WhepSession.id == session_id,
        WhepSession.camera_id == camera.id,
        WhepSession.tenant_id == identity.tenant_id,
    ).first()
    if not session:
        return Response(status_code=204)
    try:
        await delete_whep_session(session.upstream_location)
    except httpx.HTTPError:
        # Expired media sessions are cleaned from the app even if the media process restarted.
        pass
    db.delete(session)
    db.commit()
    return Response(status_code=204)
