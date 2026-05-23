import React, { useState } from 'react';
import { Shield, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

export default function DashboardSeguridad() {
  const [ultimaAlerta, setUltimaAlerta] = useState({
    placa: "XYZ9876",
    estatus: "Inactivo",
    mensaje: "Usuario inactivo - Acceso Denegado"
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Shield size={32} color="#2563eb" />
        <h1>Estación de Monitoreo - Seguridad</h1>
      </header>
      
      <hr />

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {/* Zona del Feed de Video (Simulado) */}
        <div style={{ flex: 2, background: '#1e293b', height: '400px', borderRadius: '8px', display: 'flex', alignItems: 'center', color: '#fff' }}>
          <p>[ FEED DE CÁMARA EN VIVO (WEBCAM) ]</p>
        </div>

        {/* Zona de Alertas Laterales */}
        <div style={{ flex: 1, padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <h3>Última Detección</h3>
          <div style={{ background: '#fee2e2', padding: '15px', borderRadius: '6px', borderLeft: '5px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert color="#ef4444" />
              <strong>¡ALERTA DE ACCESO!</strong>
            </div>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>{ultimaAlerta.placa}</p>
            <p style={{ margin: 0, color: '#991b1b' }}>{ultimaAlerta.mensaje}</p>
            
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>Registrar Visitante</button>
              <button style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>Ignorar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}