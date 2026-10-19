from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Literal
from datetime import datetime, timedelta
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

# Esquema para validar lo que viene desde el Frontend (React)
class UsuarioCreate(BaseModel):
    nombre: str
    placa: str
    tipo_usuario: str # 'Residente' o 'Visitante'
    estatus: str      # 'Activo' o 'Inactivo'

class UsuarioUpdate(BaseModel):
    nombre: str
    placa: str
    tipo_usuario: str
    estatus: str

class VisitanteCreate(BaseModel):
    nombre: str
    placa: str
    vigencia: Literal['12h', '24h', '7d']

@router.get("/")
def obtener_usuarios(db: Session = Depends(get_db)):
    try:
        print("Intentando leer usuarios...")
        usuarios = db.query(models.Usuario).all()
        return usuarios
    except Exception as e:
        # Esto imprimirá el error REAL en tu consola de Uvicorn
        print(f"ERROR DETECTADO: {str(e)}")
        return {"error_detalle": str(e)}

@router.post("/")
def crear_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    """Inserta un nuevo usuario en el servidor SSH"""
    # Validar si la placa ya existe para evitar errores de MySQL (Unique Key)
    existe = db.query(models.Usuario).filter(models.Usuario.placa == usuario.placa.upper()).first()
    if existe:
        raise HTTPException(status_code=400, detail="Esta placa ya está registrada")
    
    nuevo_usuario = models.Usuario(
        nombre=usuario.nombre,
        placa=usuario.placa.upper().strip(),
        tipo_usuario=usuario.tipo_usuario,
        estatus=usuario.estatus
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return {"message": "Usuario creado con éxito", "usuario": nuevo_usuario}

@router.post("/visitantes")
def crear_visitante(visitante: VisitanteCreate, db: Session = Depends(get_db)):
    placa = visitante.placa.strip().upper()
    if not visitante.nombre.strip() or not placa:
        raise HTTPException(status_code=400, detail="Nombre y placa son obligatorios")
    existe = db.query(models.Usuario).filter(models.Usuario.placa == placa).first()
    if existe:
        raise HTTPException(status_code=400, detail="Esta placa ya está registrada")

    duraciones = {'12h': timedelta(hours=12), '24h': timedelta(hours=24), '7d': timedelta(days=7)}
    nuevo_visitante = models.Usuario(
        nombre=visitante.nombre.strip(),
        placa=placa,
        tipo_usuario='Visitante',
        estatus='Activo',
        fecha_expiracion=datetime.now() + duraciones[visitante.vigencia]
    )
    db.add(nuevo_visitante)
    db.commit()
    db.refresh(nuevo_visitante)
    return {"message": "Visitante registrado con éxito", "usuario": nuevo_visitante}

@router.put("/{usuario_id}")
def actualizar_usuario(usuario_id: int, usuario: UsuarioUpdate, db: Session = Depends(get_db)):
    existente = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not existente:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    placa = usuario.placa.strip().upper()
    placa_en_uso = db.query(models.Usuario).filter(
        models.Usuario.placa == placa,
        models.Usuario.id != usuario_id
    ).first()
    if placa_en_uso:
        raise HTTPException(status_code=400, detail="Esta placa ya está registrada")

    existente.nombre = usuario.nombre.strip()
    existente.placa = placa
    existente.tipo_usuario = usuario.tipo_usuario
    existente.estatus = usuario.estatus
    db.commit()
    db.refresh(existente)
    return {"message": "Usuario actualizado con éxito", "usuario": existente}

@router.delete("/{usuario_id}")
def eliminar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(usuario)
    db.commit()
    return {"message": "Usuario eliminado con éxito"}
