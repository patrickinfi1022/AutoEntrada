from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from ..database import get_db
from ..models import models

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])

# Esquema para validar lo que viene desde el Frontend (React)
class UsuarioCreate(BaseModel):
    nombre: str
    placa: str
    tipo_usuario: str # 'Residente' o 'Visitante'
    estatus: str      # 'Activo' o 'Inactivo'

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