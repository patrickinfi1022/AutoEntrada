# app/models.py
from sqlalchemy import Column, Integer, String, Enum, DateTime, Date, Time, ForeignKey, Boolean, TIMESTAMP

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