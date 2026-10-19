# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from .routers import cameras, sites, usuarios, monitoreo
from .services.media_startup import restore_camera_streams

app = FastAPI()

# ESTA PARTE ES VITAL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Location"],
)

app.include_router(usuarios.router)
app.include_router(monitoreo.router)
app.include_router(cameras.router)
app.include_router(sites.router)

@app.on_event("startup")
async def restore_media_streams():
    await restore_camera_streams()

@app.get("/")
def read_root():
    return {"status": "AutoEntrada API is running"}
