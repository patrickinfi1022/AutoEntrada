# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="AutoEntrada API",
    description="Backend de control de acceso vehicular mediante YOLOv8 y OCR",
    version="1.0.0"
)

# Configurar CORS para que tu app de React (Frontend) pueda comunicarse con el Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción cambiar por el dominio de React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELOS DE DATOS (Esquemas de Swagger) ---
class UsuarioSchema(BaseModel):
    nombre: str
    placa: str
    tipo_usuario: str  # 'Residente' o 'Visitante'
    estatus: str       # 'Activo' o 'Inactivo'

class AccesoRegistroSchema(BaseModel):
    placa_detectada: str
    fecha: str
    hora: str
    color: str
    marca: str
    acceso_concedido: bool

# --- BASE DE DATOS VOLÁTIL (Simulada en Memoria) ---
DB_USUARIOS = [
    {"id": 1, "nombre": "Patrick Kelliher", "placa": "ABC1234", "tipo_usuario": "Residente", "estatus": "Activo"},
    {"id": 2, "nombre": "Ana Rios", "placa": "XYZ9876", "tipo_usuario": "Residente", "estatus": "Inactivo"}
]
DB_HISTORIAL = []

# --- ENDPOINTS / SERVICIOS DE LA API ---

@app.get("/", tags=["General"])
def raiz():
    return {"status": "AutoEntrada API corriendo perfectamente"}

# --- Módulo de Administrador & Seguridad: Usuarios ---

@app.get("/api/usuarios", response_model=List[dict], tags=["Usuarios"])
def obtener_usuarios():
    """Retorna la lista de todos los usuarios (Disponible para Admin y Seguridad)"""
    return DB_USUARIOS

@app.post("/api/usuarios", tags=["Usuarios"])
def crear_usuario(usuario: UsuarioSchema):
    """Crea un nuevo registro de usuario o visitante en el sistema"""
    # Validar si la placa ya existe
    if any(u["placa"] == usuario.placa.upper() for u in DB_USUARIOS):
        raise HTTPException(status_code=400, detail="La placa ya está registrada")
    
    nuevo_id = len(DB_USUARIOS) + 1
    nuevo_usuario = {
        "id": nuevo_id,
        "nombre": usuario.nombre,
        "placa": usuario.placa.upper(),
        "tipo_usuario": usuario.tipo_usuario,
        "estatus": usuario.estatus
    }
    DB_USUARIOS.append(nuevo_usuario)
    return {"message": "Usuario registrado exitosamente", "usuario": nuevo_usuario}

# --- Módulo de Monitoreo e IA ---

@app.post("/api/monitoreo/simular-deteccion", tags=["Monitoreo IA"])
def simular_deteccion_ia(placa: str, color: str = "Gris", marca: str = "Desconocida"):
    """
    Simula el disparo del script de IA cuando la cámara detecta un vehículo.
    Contrasta la placa con la memoria y genera el registro de acceso.
    """
    placa_upper = placa.upper()
    fecha_actual = datetime.now().strftime("%Y-%m-%d")
    hora_actual = datetime.now().strftime("%H:%M:%S")
    
    # Lógica de negocio (Validar acceso)
    usuario_encontrado = next((u for u in DB_USUARIOS if u["placa"] == placa_upper), None)
    
    concedido = False
    if usuario_encontrado and usuario_encontrado["estatus"] == "Activo":
        concedido = True
        
    registro = {
        "id": len(DB_HISTORIAL) + 1,
        "placa_detectada": placa_upper,
        "fecha": fecha_actual,
        "hora": hora_actual,
        "color": color,
        "marca": marca,
        "acceso_concedido": concedido
    }
    
    DB_HISTORIAL.append(registro)
    
    return {
        "acceso_concedido": concedido,
        "registro": registro,
        "usuario": usuario_encontrado if usuario_encontrado else "No Registrado"
    }

@app.get("/api/monitoreo/historial", tags=["Monitoreo IA"])
def obtener_historial():
    """Retorna el registro histórico de todos los carros que han cruzado la entrada"""
    return DB_HISTORIAL