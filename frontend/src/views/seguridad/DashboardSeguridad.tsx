import React, { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { monitoreoService } from "../../services/api";

// Definición de interfaces para el estado
interface AlertaAcceso {
  placa: string;
  mensaje: string;
  tipo: 'error' | 'success';
}

const DashboardSeguridad = () => {
  const webcamRef = useRef<Webcam>(null);
  const [ultimaAlerta, setUltimaAlerta] = useState<AlertaAcceso | null>(null);
  const [cargando, setCargando] = useState(false);

  // Función para capturar el frame y enviarlo al proceso de IA
  const capturarYDetectar = useCallback(async () => {
    if (cargando) return;

    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      try {
        // Convertir el screenshot (base64) a un Blob para enviarlo como archivo
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');

        // Petición al nuevo endpoint de detección en tiempo real
        const res = await axios.post('http://localhost:8000/api/monitoreo/detectar-realtime', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const data = res.data;

        if (data.placa && data.placa !== "No detectada") {
          if (data.acceso_concedido) {
            setUltimaAlerta({
              placa: data.placa,
              mensaje: `Acceso Concedido: ${data.usuario.nombre}`,
              tipo: 'success'
            });
          } else {
            setUltimaAlerta({
              placa: data.placa,
              mensaje: data.usuario === "No Registrado" ? "Vehículo No Registrado" : "Usuario Inactivo",
              tipo: 'error'
            });
          }
        }
      } catch (error) {
        console.error("Error en la detección de IA:", error);
      }
    }
  }, [webcamRef, cargando]);

  // Configuración del intervalo de detección (cada 3 segundos)
  useEffect(() => {
    const intervalo = setInterval(() => {
      capturarYDetectar();
    }, 3000);
    return () => clearInterval(intervalo);
  }, [capturarYDetectar]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel de Monitoreo de Accesos</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sección de la Cámara */}
        <div className="bg-white p-4 rounded-xl shadow-lg flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            Cámara en Vivo - Detección YOLOv8
          </h2>
          
          <div className="relative border-4 border-gray-900 rounded-lg overflow-hidden bg-black w-full max-w-md">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-auto"
              videoConstraints={{ facingMode: "environment" }}
            />
            {/* Animación de escaneo visual */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan"></div>
          </div>
          
          <p className="mt-4 text-sm text-gray-500 italic">
            El sistema está analizando frames automáticamente cada 3 segundos.
          </p>
        </div>

        {/* Sección de Alertas y Resultados */}
        <div className="space-y-6">
          {ultimaAlerta ? (
            <div className={`p-6 rounded-xl border-l-8 shadow-md transition-all ${
              ultimaAlerta.tipo === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
            }`}>
              <h3 className="text-xl font-bold mb-2">Última Detección</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-3xl font-mono font-black text-gray-800">{ultimaAlerta.placa}</p>
                  <p className={`text-lg font-semibold ${
                    ultimaAlerta.tipo === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {ultimaAlerta.mensaje}
                  </p>
                </div>
                <div className={`text-5xl ${ultimaAlerta.tipo === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                  {ultimaAlerta.tipo === 'success' ? '✅' : '🚫'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
              <p className="text-lg">Esperando detección de placas...</p>
            </div>
          )}

          {/* Aquí puedes incluir la tabla de historial que ya tenías */}
        </div>
      </div>
    </div>
  );
};

export default DashboardSeguridad;