# backend/app/utils/ia_logic.py
import cv2
import numpy as np
import easyocr
import re
from ultralytics import YOLO

# Inicializar modelos (se cargan una sola vez)
model = YOLO("yolov8n.pt") 
# Añadimos 'es' (español) para mejorar el reconocimiento en placas de México
reader = easyocr.Reader(['es', 'en'], gpu=False) 

def limpiar_texto_placa(texto_sucio):
    """
    Limpia el texto detectado y valida si tiene un formato de placa real.
    """
    # Eliminar espacios y caracteres no alfanuméricos
    texto = re.sub(r'[^A-Z0-9]', '', texto_sucio.upper())
    
    # Patrón para placas de México (ej: KFR259A o KFR259)
    # Busca una secuencia de 6 a 8 caracteres alfanuméricos
    if len(texto) >= 6 and len(texto) <= 8:
        return texto
    return None

def mejorar_recorte(recorte_bgr):
    """
    Aplica filtros para que el OCR lea mejor los caracteres.
    """
    # 1. Convertir a escala de grises
    gris = cv2.cvtColor(recorte_bgr, cv2.COLOR_BGR2GRAY)
    
    # 2. Aumentar el tamaño (el OCR funciona mejor con imágenes grandes)
    gris = cv2.resize(gris, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # 3. Aplicar un filtro de contraste (CLAHE) para resaltar las letras
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    mejorada = clahe.apply(gris)
    
    return mejorada

def procesar_deteccion_placa(imagen_bytes):
    # Convertir bytes a imagen de OpenCV
    nparr = np.frombuffer(imagen_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return None

    # Ejecutar YOLOv8 para buscar el carro (clase 2)
    # conf=0.4 evita falsos positivos
    results = model(frame, conf=0.4)
    
    for res in results:
        for box in res.boxes:
            if int(box.cls[0]) == 2: # Carro
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Ajustar el recorte al área inferior del carro (donde suelen estar las placas)
                # Esto reduce el "ruido" de los faros y el parabrisas
                alto_carro = y2 - y1
                corte_inferior = int(y1 + (alto_carro * 0.4)) 
                recorte_auto = frame[corte_inferior:y2, x1:x2]
                
                # Mejorar imagen antes del OCR
                recorte_listo = mejorar_recorte(recorte_auto)
                
                # OCR con parámetros de optimización
                # allowlist: solo busca letras y números
                resultados_ocr = reader.readtext(
                    recorte_listo, 
                    detail=0, 
                    paragraph=False,
                    allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
                    contrast_ths=0.1
                )
                
                print(f"🔍 Intento de lectura: {resultados_ocr}") 

                for texto in resultados_ocr:
                    placa_validada = limpiar_texto_placa(texto)
                    if placa_validada:
                        print(f"✅ Placa Detectada: {placa_validada}")
                        return placa_validada
                        
    return None