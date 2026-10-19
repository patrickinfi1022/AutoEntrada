# app/models.py
from sqlalchemy import Column, Integer, String, Enum, DateTime, Date, Time, ForeignKey, Boolean, TIMESTAMP, Index

from sqlalchemy.sql import func
from ..database import Base

class RolCuenta(Base):
    __tablename__ = "roles_cuenta"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum('Admin', 'Seguridad', 'Usuario'), nullable=False)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())

class Usuario(Base): # <--- Verifica que diga 'Usuario' exactamente así
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    placa = Column(String(15), nullable=False, unique=True)
    tipo_usuario = Column(Enum('Residente', 'Visitante'), nullable=False)
    estatus = Column(Enum('Activo', 'Inactivo'), default='Activo')
    creado_por_cuenta_id = Column(Integer, nullable=True) # Simplificado para evitar errores de relación por ahora
    fecha_expiracion = Column(DateTime, nullable=True)
    fecha_registro = Column(TIMESTAMP, server_default=func.now())

class RegistroAcceso(Base):
    __tablename__ = "registro_accesos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    placa_detectada = Column(String(15), nullable=False)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    foto_path = Column(String(255), nullable=False)
    color_detectado = Column(String(30), nullable=True)
    marca_detectada = Column(String(50), nullable=True)
    acceso_concedido = Column(Boolean, nullable=False)

class ParkingSite(Base):
    __tablename__ = "parking_sites"

    id = Column(String(36), primary_key=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    timezone = Column(String(64), nullable=False, default="America/Mexico_City")
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(TIMESTAMP, server_default=func.now())

class SiteMembership(Base):
    __tablename__ = "site_memberships"
    __table_args__ = (Index("uq_site_memberships_site_subject", "site_id", "subject", unique=True),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    site_id = Column(String(36), ForeignKey("parking_sites.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(128), nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

class EdgeGateway(Base):
    __tablename__ = "edge_gateways"

    id = Column(String(36), primary_key=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    site_id = Column(String(36), ForeignKey("parking_sites.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    # This address is expected to be reachable only through the private control-plane VPN.
    media_api_url = Column(String(512), nullable=False)
    enrollment_token_hash = Column(String(64), nullable=False, unique=True)
    status = Column(String(20), nullable=False, default="pending")
    last_seen_at = Column(DateTime, nullable=True)
    configured_stream_count = Column(Integer, nullable=False, default=0)
    media_version = Column(String(40), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

class CameraStream(Base):
    __tablename__ = "camera_streams"

    id = Column(String(36), primary_key=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    site_id = Column(String(36), ForeignKey("parking_sites.id", ondelete="SET NULL"), nullable=True, index=True)
    gateway_id = Column(String(36), ForeignKey("edge_gateways.id", ondelete="SET NULL"), nullable=True, index=True)
    stream_key = Column(String(80), nullable=False, unique=True)
    label = Column(String(100), nullable=False)
    host = Column(String(45), nullable=False)
    rtsp_username = Column(String(100), nullable=False)
    password_encrypted = Column(String(512), nullable=False)
    channel = Column(Integer, nullable=False, default=101)
    created_at = Column(TIMESTAMP, server_default=func.now())

class WhepSession(Base):
    __tablename__ = "whep_sessions"
    __table_args__ = (Index("ix_whep_sessions_tenant_camera", "tenant_id", "camera_id"),)

    id = Column(String(36), primary_key=True)
    tenant_id = Column(String(64), nullable=False)
    camera_id = Column(String(36), nullable=False)
    upstream_location = Column(String(1024), nullable=False)
    expires_at = Column(DateTime, nullable=False)
