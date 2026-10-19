"""Tenant-scoped parking sites and enrollment for on-premise video gateways."""
import hashlib
import ipaddress
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlsplit
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import Identity, get_identity
from ..database import get_db
from ..models.models import EdgeGateway, ParkingSite, SiteMembership

router = APIRouter(tags=["Estacionamientos y gateways"])


class SiteCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    timezone: str = Field(default="America/Mexico_City", min_length=3, max_length=64)


class GatewayCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    # This must be the gateway's private WireGuard/VPN address, never a public API URL.
    media_api_url: str = Field(min_length=10, max_length=512)


class GatewayHeartbeat(BaseModel):
    media_available: bool
    configured_streams: int = Field(default=0, ge=0, le=10000)
    media_version: str | None = Field(default=None, max_length=40)


class SiteMemberCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=128)
    role: str = Field(pattern="^(Seguridad|Usuario)$")


def _private_media_url(value: str) -> str:
    try:
        parsed = urlsplit(value)
        address = ipaddress.ip_address(parsed.hostname or "")
        port = parsed.port or 1984
    except (ValueError, TypeError) as exc:
        raise HTTPException(status_code=422, detail="media_api_url debe apuntar a una IP privada literal") from exc
    if parsed.scheme != "http" or parsed.username or parsed.password or not address.is_private or address.is_loopback or address.is_link_local:
        raise HTTPException(status_code=422, detail="El API del gateway solo se admite por HTTP dentro de la VPN privada")
    return f"http://{address.compressed}:{port}"


def _get_site(site_id: str, identity: Identity, db: Session) -> ParkingSite:
    site = db.query(ParkingSite).filter(
        ParkingSite.id == site_id,
        ParkingSite.tenant_id == identity.tenant_id,
    ).first()
    if not site:
        raise HTTPException(status_code=404, detail="Estacionamiento no encontrado")
    return site


def _require_site_access(site_id: str, identity: Identity, db: Session) -> None:
    if identity.role == "Admin":
        return
    membership = db.query(SiteMembership.id).filter(
        SiteMembership.site_id == site_id,
        SiteMembership.tenant_id == identity.tenant_id,
        SiteMembership.subject == identity.subject,
        SiteMembership.role == identity.role,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="No tienes acceso a este estacionamiento")


@router.get("/api/sites")
def list_sites(identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    query = db.query(ParkingSite).filter(ParkingSite.tenant_id == identity.tenant_id)
    if identity.role != "Admin":
        query = query.join(SiteMembership, SiteMembership.site_id == ParkingSite.id).filter(
            SiteMembership.subject == identity.subject,
            SiteMembership.role == identity.role,
        )
    sites = query.order_by(ParkingSite.name).all()
    return [{"id": site.id, "name": site.name, "timezone": site.timezone, "status": site.status} for site in sites]


@router.post("/api/sites", status_code=201)
def create_site(payload: SiteCreate, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede crear estacionamientos")
    site = ParkingSite(
        id=str(uuid4()), tenant_id=identity.tenant_id,
        name=payload.name.strip(), timezone=payload.timezone.strip(), status="active",
    )
    db.add(site)
    db.commit()
    return {"id": site.id, "name": site.name, "timezone": site.timezone, "status": site.status}


@router.get("/api/sites/{site_id}/edges")
def list_site_edges(site_id: str, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    _get_site(site_id, identity, db)
    _require_site_access(site_id, identity, db)
    edges = db.query(EdgeGateway).filter(
        EdgeGateway.site_id == site_id,
        EdgeGateway.tenant_id == identity.tenant_id,
    ).order_by(EdgeGateway.created_at.desc()).all()
    return [{
        "id": edge.id, "name": edge.name,
        "status": "offline" if edge.last_seen_at and edge.last_seen_at < datetime.utcnow() - timedelta(seconds=90) else edge.status,
        "last_seen_at": edge.last_seen_at,
        "configured_streams": edge.configured_stream_count,
        "media_version": edge.media_version,
    } for edge in edges]


@router.get("/api/sites/{site_id}/members")
def list_site_members(site_id: str, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede gestionar miembros")
    _get_site(site_id, identity, db)
    members = db.query(SiteMembership).filter(
        SiteMembership.site_id == site_id,
        SiteMembership.tenant_id == identity.tenant_id,
    ).order_by(SiteMembership.subject).all()
    return [{"subject": member.subject, "role": member.role} for member in members]


@router.post("/api/sites/{site_id}/members", status_code=201)
def upsert_site_member(site_id: str, payload: SiteMemberCreate, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede asignar miembros")
    _get_site(site_id, identity, db)
    subject = payload.subject.strip()
    if not subject:
        raise HTTPException(status_code=422, detail="El identificador del usuario es obligatorio")
    member = db.query(SiteMembership).filter(
        SiteMembership.site_id == site_id,
        SiteMembership.tenant_id == identity.tenant_id,
        SiteMembership.subject == subject,
    ).first()
    if member:
        member.role = payload.role
    else:
        member = SiteMembership(tenant_id=identity.tenant_id, site_id=site_id, subject=subject, role=payload.role)
        db.add(member)
    db.commit()
    return {"site_id": site_id, "subject": member.subject, "role": member.role}


@router.delete("/api/sites/{site_id}/members/{subject}", status_code=204)
def remove_site_member(site_id: str, subject: str, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede retirar miembros")
    _get_site(site_id, identity, db)
    member = db.query(SiteMembership).filter(
        SiteMembership.site_id == site_id,
        SiteMembership.tenant_id == identity.tenant_id,
        SiteMembership.subject == subject,
    ).first()
    if member:
        db.delete(member)
        db.commit()
    return Response(status_code=204)


@router.post("/api/sites/{site_id}/edges", status_code=201)
def enroll_edge(site_id: str, payload: GatewayCreate, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede enrolar gateways")
    _get_site(site_id, identity, db)
    raw_token = secrets.token_urlsafe(48)
    edge = EdgeGateway(
        id=str(uuid4()), tenant_id=identity.tenant_id, site_id=site_id,
        name=payload.name.strip(), media_api_url=_private_media_url(payload.media_api_url),
        enrollment_token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
        status="pending",
    )
    db.add(edge)
    db.commit()
    # The bearer token is shown exactly once. Store it only in the site gateway's secret store.
    return JSONResponse(
        status_code=201,
        content={"id": edge.id, "name": edge.name, "status": edge.status, "edge_token": raw_token},
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


@router.post("/api/sites/{site_id}/edges/{edge_id}/rotate-token")
def rotate_edge_token(site_id: str, edge_id: str, identity: Identity = Depends(get_identity), db: Session = Depends(get_db)):
    if identity.role != "Admin":
        raise HTTPException(status_code=403, detail="Solo un administrador puede rotar el token del gateway")
    _get_site(site_id, identity, db)
    edge = db.query(EdgeGateway).filter(
        EdgeGateway.id == edge_id,
        EdgeGateway.site_id == site_id,
        EdgeGateway.tenant_id == identity.tenant_id,
    ).first()
    if not edge:
        raise HTTPException(status_code=404, detail="Gateway no encontrado")
    raw_token = secrets.token_urlsafe(48)
    edge.enrollment_token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    edge.status = "pending"
    db.commit()
    return JSONResponse(
        content={"id": edge.id, "name": edge.name, "status": edge.status, "edge_token": raw_token},
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


def get_edge_gateway(request: Request, db: Session = Depends(get_db)) -> EdgeGateway:
    auth = request.headers.get("authorization", "")
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or len(token) < 32:
        raise HTTPException(status_code=401, detail="Se requiere el token de enrolamiento del gateway")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    edge = db.query(EdgeGateway).filter(EdgeGateway.enrollment_token_hash == token_hash).first()
    if not edge or edge.status == "revoked":
        raise HTTPException(status_code=401, detail="Token de gateway inválido")
    return edge


@router.post("/api/edge/heartbeat")
def edge_heartbeat(payload: GatewayHeartbeat, edge: EdgeGateway = Depends(get_edge_gateway), db: Session = Depends(get_db)):
    edge.last_seen_at = datetime.utcnow()
    edge.status = "online" if payload.media_available else "degraded"
    edge.configured_stream_count = payload.configured_streams
    edge.media_version = payload.media_version
    db.commit()
    return {"edge_id": edge.id, "site_id": edge.site_id, "status": edge.status, "server_time": datetime.utcnow().isoformat() + "Z"}
