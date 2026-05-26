# app/routers/monitoreo.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import models # Importación correcta
from datetime import datetime
from fastapi import File, UploadFile
from ..utils import procesar_deteccion_placa # Importamos la función nueva

router = APIRouter(prefix="/api/monitoreo", tags=["Monitoreo IA"])

@router.post("/simular-deteccion")
def simular_deteccion(
    placa: str, 
    color: str = "Gris", 
    marca: str = "Desconocida",
    db: Session = Depends(get_db)
):
    placa_upper = placa.strip().upper()
    ahora = datetime.now()
    
    # Busca en la clase Usuario (singular) definida en models.py
    usuario = db.query(models.Usuario).filter(models.Usuario.placa == placa_upper).first()
    
    concedido = False
    info_usuario = "No Registrado"

    if usuario:
        if usuario.estatus == "Activo":
            concedido = True
            info_usuario = {"nombre": usuario.nombre, "tipo": usuario.tipo_usuario}
        else:
            info_usuario = {"nombre": usuario.nombre, "mensaje": "Usuario Inactivo"}

    nuevo_acceso = models.RegistroAcceso(
        placa_detectada=placa_upper,
        fecha=ahora.date(),
        hora=ahora.time(),
        foto_path=f"media/capturas/{placa_upper}.jpg",
        color_detectado=color,
        marca_detectada=marca,
        acceso_concedido=concedido
    )
    
    db.add(nuevo_acceso)
    db.commit()
    db.refresh(nuevo_acceso)

    return {
        "acceso_concedido": concedido,
        "usuario": info_usuario,
        "detalles_registro": {
            "id": nuevo_acceso.id,
            "placa_detectada": nuevo_acceso.placa_detectada, # Agregado para que el Frontend no falle
            "fecha_hora": f"{nuevo_acceso.fecha} {nuevo_acceso.hora}"
        }
    }

@router.post("/detectar-realtime")
async def detectar_realtime(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Leer la imagen enviada desde el frontend
    contenido = await file.read()
    
    # 2. Llamar a la función (CUIDADO: usa el nombre correcto aquí)
    placa_leida = procesar_deteccion_placa(contenido) 
    
    if placa_leida:
        # 3. Reutilizar tu lógica de simulación para validar y registrar
        return simular_deteccion(placa=placa_leida, db=db)
    
    return {"mensaje": "Buscando placas...", "acceso_concedido": False}