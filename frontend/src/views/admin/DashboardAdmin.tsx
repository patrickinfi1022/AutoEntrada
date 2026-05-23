import React from 'react';
import { Users, History, Settings } from 'lucide-react';

export default function DashboardAdmin() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Panel de Administración (AutoEntrada)</h1>
      <p>Gestión global de accesos, usuarios y configuraciones del sistema.</p>
      
      <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
        <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '8px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Users /> <strong>Usuarios Registrados</strong></div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0' }}>142</p>
        </div>
        <div style={{ padding: '20px', background: '#f1f5f9', borderRadius: '8px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History /> <strong>Accesos Hoy</strong></div>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0' }}>48</p>
        </div>
      </div>
    </div>
  );
}