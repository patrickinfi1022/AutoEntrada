# backend/app/utils/ia_logic.py
import cv2
import numpy as np
import easyocr
from ultralytics import YOLO

# Inicializar modelos una sola vez al cargar el módulo
model = YOLO("yolov8n.pt") 
reader = easyocr.Reader(['en']) 

def procesar_deteccion_placa(imagen_bytes):
    nparr = np.frombuffer(imagen_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        return None

    results = model(frame, stream=True)
    for res in results:
        for box in res.boxes:
            if int(box.cls[0]) == 2: # Detectó un carro
                print("🚗 ¡Carro detectado!") # <--- DEBUG
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                recorte = frame[y1:y2, x1:x2]
                
                texto_ocr = reader.readtext(recorte)
                print(f"📝 OCR detectó: {texto_ocr}") # <--- DEBUG
                
                if texto_ocr:
                    placa = texto_ocr[0][-2].upper().replace(" ", "")
                    print(f"✅ Placa procesada: {placa}") # <--- DEBUG
                    return placa
    return None