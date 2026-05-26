# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import usuarios, monitoreo # Verifica que tus nombres coincidan

app = FastAPI()

# ESTA PARTE ES VITAL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite que React (5173) se conecte
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(monitoreo.router)

@app.get("/")
def read_root():
    return {"status": "AutoEntrada API is running"}