import cv2
import easyocr
import numpy as np
from ultralytics import YOLO

# Cargamos el modelo (puedes usar 'yolov8n.pt' para empezar o uno entrenado para placas)
model = YOLO('yolov8n.pt') 
reader = easyocr.Reader(['es']) # Configurado para español/números

def procesar_frame_ia(imagen_bytes):
    # Convertir bytes a imagen de OpenCV
    nparr = np.frombuffer(imagen_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 1. Detectar objetos con YOLO
    results = model(frame, classes=[2, 3, 5, 7]) # Clases de vehículos en COCO
    
    placa_texto = "No detectada"
    
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Aquí iría la lógica específica de recortar la placa
            # Por ahora, simularemos que si detecta un "carro", intentamos OCR en el centro
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            recorte = frame[y1:y2, x1:x2]
            
            # 2. Aplicar OCR
            resultado_ocr = reader.readtext(recorte)
            if resultado_ocr:
                placa_texto = resultado_ocr[0][-2] # Extraer el texto detectado
    
    return placa_texto.upper()