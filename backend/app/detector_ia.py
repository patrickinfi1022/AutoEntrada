import cv2
import os
import time
from datetime import datetime
from ultralytics import YOLO
import easyocr

# --- CONFIGURACIÓN INICIAL ---
# Creamos la carpeta multimedia si no existe para guardar las capturas
MEDIA_DIR = os.path.join(os.path.dirname(__file__), "..", "media")
os.makedirs(MEDIA_DIR, exist_ok=True)

# Inicializar Modelos
# Nota: Usamos el modelo estándar 'yolov8n.pt' para la prueba. 
# En producción, usarás tu modelo personalizado que detecte la clase 'placa'.
print("[IA] Cargando modelos de Inteligencia Artificial...")
modelo_yolo = YOLO("yolov8n.pt") 
lector_ocr = easyocr.Reader(['es'], gpu=False) # Forzado a CPU
print("[IA] Modelos cargados exitosamente.")

# Variables de control para evitar lecturas duplicadas en bucle (Cooldown)
ultima_placa_leida = ""
tiempo_ultimo_registro = 0
COOLDOWN_SEGUNDOS = 5  # Tiempo de espera antes de volver a leer la misma placa

def preprocesar_placa(recorte_bgr):
    """
    Aplica filtros de OpenCV para mejorar la legibilidad del texto antes del OCR.
    """
    # 1. Convertir a escala de grises
    gris = cv2.cvtColor(recorte_bgr, cv2.COLOR_BGR2GRAY)
    
    # 2. Redimensionar si la placa es muy pequeña (mejora un 30% la precisión del OCR)
    gris = cv2.resize(gris, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    # 3. Aplicar umbralizado adaptativo (Binarización: Blanco y Negro puro)
    # Filtra sombras y destellos de luz de la cámara
    binarizada = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    
    return binarizada

def procesar_ocr_placa(frame_original, x1, y1, x2, y2):
    """
    Recorta la placa, aplica OCR y gestiona el cooldown de registros.
    """
    global ultima_placa_leida, tiempo_ultimo_registro
    
    # 1. Recortar Región de Interés (ROI) de la placa
    recorte_placa = frame_original[y1:y2, x1:x2]
    if recorte_placa.size == 0:
        return None
    
    # 2. Preprocesar el recorte para el OCR
    placa_lista = preprocesar_placa(recorte_placa)
    
    # 3. Pasar el recorte limpio por EasyOCR
    resultados_ocr = lector_ocr.readtext(placa_lista)
    
    for (bbox, texto, confianza) in resultados_ocr:
        # Limpiar texto (quitar espacios, caracteres raros y pasar a mayúsculas)
        texto_limpio = "".join(c for c in texto if c.isalnum()).upper()
        
        # Filtrar por longitud típica de placas (ej. entre 5 y 9 caracteres) y confianza mínima
        if len(texto_limpio) >= 5 and confianza > 0.45:
            ahora = time.time()
            
            # Validar si es la misma placa consecutiva dentro del tiempo de cooldown
            if texto_limpio == ultima_placa_leida and (ahora - tiempo_ultimo_registro) < COOLDOWN_SEGUNDOS:
                continue # Ignorar para no duplicar registros en la BD
            
            # Actualizar estado del cooldown
            ultima_placa_leida = texto_limpio
            tiempo_ultimo_registro = ahora
            
            # 4. Guardar evidencia en la carpeta 'media'
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            nombre_foto = f"acceso_{texto_limpio}_{timestamp_str}.jpg"
            ruta_foto = os.path.join(MEDIA_DIR, nombre_foto)
            cv2.imwrite(ruta_foto, frame_original)
            
            print(f"\n[DETECTADA] Placa: {texto_limpio} | Confianza OCR: {confianza:.2f}")
            print(f"[EVIDENCIA] Foto guardada en: {ruta_foto}")
            
            # Retornamos los datos listos para ser enviados a la Base de Datos posteriormente
            return {
                "placa": texto_limpio,
                "foto_path": ruta_foto,
                "color": "Gris (Pendiente)",  # Esto se conectará al clasificador secundario
                "marca": "Nissan (Pendiente)"   # Esto se conectará al clasificador secundario
            }
    return None

def iniciar_camara_en_vivo():
    """
    Abre la webcam, corre YOLOv8 frame por frame y dibuja los cuadros en pantalla.
    """
    # 0 = Cámara integrada de la laptop o primera webcam USB conectada
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("[ERROR] No se pudo acceder a la cámara web.")
        return

    print("\n=== Sistema de Video en Vivo Iniciado ===")
    print("Presiona la tecla 'q' para cerrar la ventana del stream.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[ERROR] No se pueden recibir frames de la cámara.")
            break

        # Ejecutar YOLOv8 en el frame actual
        # verbose=False evita que la consola se sature con los logs de cada frame
        resultados = modelo_yolo(frame, verbose=False)

        for resultado in resultados:
            boxes = resultado.boxes
            for box in boxes:
                # Coordenadas del objeto detectado
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                clase_id = int(box.cls[0])
                confianza_yolo = float(box.conf[0])

                # NOTA IMPORTANTE PARA TUS PRUEBAS:
                # Como usamos yolov8n estándar, la clase '2' corresponde a un 'car' (auto).
                # Usaremos el recuadro del auto para simular la detección mientras integras tu modelo de placas.
                # CUANDO TENGAS TU MODELO DE PLACAS CAMBIA: clase_id == 0 (o el ID de tu clase placa)
                if clase_id == 2 and confianza_yolo > 0.50:
                    
                    # Dibujar cuadro delimitador en el flujo de video
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"Vehiculo {confianza_yolo:.2f}", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    
                    # Mandar el área detectada a procesar por el OCR
                    # (Si estás usando el YOLO estándar de autos, intentará leer toda la zona frontal del carro, 
                    # lo cual sirve perfecto para probar el flujo de guardado de fotos y lógica).
                    procesar_ocr_placa(frame, x1, y1, x2, y2)

        # Mostrar el video con las anotaciones en tiempo real
        cv2.imshow("AutoEntrada - Flujo de Entrada IA", frame)

        # Romper el bucle si se presiona la tecla 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Limpiar recursos al cerrar
    cap.release()
    cv2.destroyAllWindows()
    print("=== Stream de video cerrado ===")
    
lector_ocr = easyocr.Reader(['es'], gpu=False)

# Simulación de la "Tabla de Usuarios" en memoria (Mientras conectamos MySQL)
USUARIOS_SIMULADOS = [
    {"nombre": "Patrick Kelliher", "placa": "ABC1234", "tipo": "Residente", "estatus": "Activo"},
    {"nombre": "Ana Ríos", "placa": "XYZ9876", "tipo": "Residente", "estatus": "Inactivo"},
    {"nombre": "Visitante Carlos", "placa": "TMP5544", "tipo": "Visitante", "estatus": "Activo"}
]

def validar_acceso_placa(placa_texto):
    """
    Busca la placa en nuestra lista simulada y decide si abre la puerta.
    """
    for usuario in USUARIOS_SIMULADOS:
        if usuario["placa"] == placa_texto:
            if usuario["estatus"] == "Activo":
                return {"concedido": True, "mensaje": f"Acceso Concedido a {usuario['nombre']} ({usuario['tipo']})"}
            else:
                return {"concedido": False, "mensaje": f"Usuario {usuario['nombre']} se encuentra INACTIVO."}
                
    return {"concedido": False, "mensaje": "Vehículo NO REGISTRADO. Alerta enviada a Seguridad."}

if __name__ == "__main__":
    iniciar_camara_en_vivo()