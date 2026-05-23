import sys
import cv2
from ultralytics import YOLO
import easyocr
import sqlalchemy

print("--- Verificando Configuración del Entorno ---")
print(f"Versión de Python: {sys.version.split()[0]}")
print(f"OpenCV listo (Versión: {cv2.__version__})")

# Probar carga de YOLOv8
try:
    model = YOLO("yolov8n.pt")
    print("YOLOv8: Modelo base cargado exitosamente.")
except Exception as e:
    print(f"Error cargando YOLOv8: {e}")

# Probar carga de EasyOCR
try:
    reader = easyocr.Reader(['es'], gpu=False)
    print("EasyOCR: Inicializado correctamente en modo CPU.")
except Exception as e:
    print(f"Error cargando EasyOCR: {e}")

print("SQLAlchemy listo para conectar a MySQL.")
print("--------------------------------------------")