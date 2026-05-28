import React, { useRef, useCallback, useEffect, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { ShieldCheck, ShieldX, ScanLine, Camera } from "lucide-react";

interface AlertaAcceso {
  placa: string;
  mensaje: string;
  tipo: 'error' | 'success';
}

const DashboardSeguridad = () => {
  const webcamRef = useRef<Webcam>(null);
  const [ultimaAlerta, setUltimaAlerta] = useState<AlertaAcceso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [pulso, setPulso] = useState(false);

  const capturarYDetectar = useCallback(async () => {
    if (cargando) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      try {
        setCargando(true);
        setPulso(true);
        setTimeout(() => setPulso(false), 600);

        const response = await fetch(imageSrc);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');

        const res = await axios.post('http://localhost:8000/api/monitoreo/detectar-realtime', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const data = res.data;
        console.log(data)
        if (data.acceso_concedido) {
          setUltimaAlerta({ placa: data.placa, mensaje: `Acceso concedido — ${data.usuario.nombre}`, tipo: 'success' });
        }
        else {
          if (data.detalles_registro) {
            setUltimaAlerta({ placa: data.placa, mensaje: data.usuario === "No Registrado" ? "Vehículo no registrado" : "Usuario inactivo", tipo: 'error' });
          }
          else setUltimaAlerta(null)
        }
      } catch (error) {
        console.error("Error en la detección de IA:", error);
      } finally {
        setCargando(false);
      }
    }
  }, [webcamRef, cargando]);

  useEffect(() => {
    const intervalo = setInterval(() => { capturarYDetectar(); }, 3000);
    return () => clearInterval(intervalo);
  }, [capturarYDetectar]);

  return (
    <div style={{ minHeight: '100vh', background: '#f1efe8', padding: '2rem', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#042C53', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={20} color="#85B7EB" />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: '#0f172a', textAlign: "start" }}>Panel de monitoreo</h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Detección vehicular en tiempo real · YOLOv8</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 99, padding: '5px 12px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#639922', display: 'inline-block', animation: 'blink 1.4s infinite' }} />
          <span style={{ fontSize: 12, color: '#3B6D11', fontWeight: 500 }}>En vivo</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>

        {/* Cámara */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={16} color="#64748b" />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Cámara en vivo</span>
          </div>

          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#0f172a', aspectRatio: '4/3' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              videoConstraints={{ facingMode: "environment" }}
            />
            {/* Línea de escaneo */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: '#378ADD', opacity: 0.7,
              animation: 'scan 2s linear infinite',
            }} />
            {/* Esquinas de overlay */}
            <div style={{ position: 'absolute', top: 12, left: 12, width: 20, height: 20, borderTop: '2px solid #378ADD', borderLeft: '2px solid #378ADD', borderRadius: '3px 0 0 0' }} />
            <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, borderTop: '2px solid #378ADD', borderRight: '2px solid #378ADD', borderRadius: '0 3px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 12, left: 12, width: 20, height: 20, borderBottom: '2px solid #378ADD', borderLeft: '2px solid #378ADD', borderRadius: '0 0 0 3px' }} />
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 20, height: 20, borderBottom: '2px solid #378ADD', borderRight: '2px solid #378ADD', borderRadius: '0 0 3px 0' }} />
            {/* Badge de análisis */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(4,44,83,0.75)', borderRadius: 99, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ScanLine size={13} color="#85B7EB" />
              <span style={{ fontSize: 11, color: '#B5D4F4', fontWeight: 500 }}>Analizando cada 3s</span>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Última detección */}
          {ultimaAlerta ? (
            <div style={{
              background: '#fff',
              border: `0.5px solid ${ultimaAlerta.tipo === 'success' ? '#C0DD97' : '#F7C1C1'}`,
              borderLeft: `4px solid ${ultimaAlerta.tipo === 'success' ? '#639922' : '#E24B4A'}`,
              borderRadius: 16,
              padding: '1.5rem',
            }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Última detección</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 32, fontWeight: 500, fontFamily: 'monospace', color: '#0f172a', margin: '0 0 6px', letterSpacing: 3 }}>
                    {ultimaAlerta.placa}
                  </p>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: ultimaAlerta.tipo === 'success' ? '#3B6D11' : '#A32D2D' }}>
                    {ultimaAlerta.mensaje}
                  </p>
                </div>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: ultimaAlerta.tipo === 'success' ? '#EAF3DE' : '#FCEBEB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {ultimaAlerta.tipo === 'success'
                    ? <ShieldCheck size={26} color="#3B6D11" />
                    : <ShieldX size={26} color="#A32D2D" />
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#fff', border: '1.5px dashed rgba(0,0,0,0.1)',
              borderRadius: 16, padding: '2.5rem 1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <ScanLine size={28} color="#cbd5e1" />
              <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>Esperando detección de placas...</p>
            </div>
          )}

          {/* Stats rápidas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Intervalo', value: '3s', icon: '⏱' },
              { label: 'Modelo', value: 'YOLOv8', icon: '🤖' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: '1rem' }}>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 4px' }}>{s.label}</p>
                <p style={{ fontSize: 16, fontWeight: 500, color: '#0f172a', margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default DashboardSeguridad;