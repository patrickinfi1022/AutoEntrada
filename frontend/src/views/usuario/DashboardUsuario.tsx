import React from 'react';
import { User, Key, Calendar } from 'lucide-react';

export default function DashboardUsuario() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <User size={32} color="#475569" />
        <h1>Portal de Residentes</h1>
      </header>
      <hr />
      
      <div style={{ marginTop: '20px', maxWidth: '500px', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <h3><Key size={18} style={{ marginRight: '5px' }} /> Pre-registrar Visitante Temporal</h3>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Recuerda que tienes un límite de máximo 2 vehículos visitantes activos de forma simultánea.</p>
        
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          <input type="text" placeholder="Nombre del visitante" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <input type="text" placeholder="Placa del vehículo" style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <select style={{ padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option>Duración: 12 Horas</option>
            <option>Duración: 24 Horas</option>
            <option>Duración: 7 Días</option>
          </select>
          <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Generar Pase Temporal
          </button>
        </form>
      </div>
    </div>
  );
}