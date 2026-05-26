import React, { useState } from 'react';
import { Car, Lock, User } from 'lucide-react';

export default function Login() {
  // Estados para capturar lo que escribe el usuario
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Limpiamos espacios
    const userTrimmed = username.trim().toLowerCase();

    if (!userTrimmed || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    // SIMULACIÓN DE AUTENTICACIÓN POR ROLES (Mientras conectamos la API)
    // Evaluamos el nombre de usuario para determinar su rol y destino
    if (userTrimmed === 'admin') {
      localStorage.setItem('user_rol', 'Admin');
      localStorage.setItem('username', username);
      window.location.href = '/admin';
    } else if (userTrimmed === 'caseta' || userTrimmed === 'seguridad') {
      localStorage.setItem('user_rol', 'Seguridad');
      localStorage.setItem('username', username);
      window.location.href = '/seguridad';
    } else if (userTrimmed === 'residente' || userTrimmed === 'patrick') {
      localStorage.setItem('user_rol', 'Usuario');
      localStorage.setItem('username', username);
      window.location.href = '/residente';
    } else {
      // Si pone cualquier otra cosa, simulamos un error de credenciales
      setError('Usuario o contraseña incorrectos. Prueba con: admin, seguridad o residente.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '40px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', width: '350px' }}>
        
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <Car size={44} color="#2563eb" style={{ margin: '0 auto 10px' }} />
          <h2 style={{ margin: '0 0 5px', color: '#0f172a' }}>AutoEntrada</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Control de Acceso Vehicular Inteligente</p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', border: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Input de Usuario */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Nombre de Usuario</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', backgroundColor: '#fff' }}>
              <User size={18} color="#64748b" style={{ marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Ej: admin, caseta, residente" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Input de Contraseña */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Contraseña</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '10px', backgroundColor: '#fff' }}>
              <Lock size={18} color="#64748b" style={{ marginRight: '8px' }} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Botón de Ingreso */}
          <button 
            type="submit" 
            style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', transition: 'background 0.2s' }}
          >
            Iniciar Sesión
          </button>
        </form>

        {/* Nota informativa de desarrollo */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
          <p style={{ margin: 0 }}>Cuentas demo (usa cualquier clave):</p>
          <p style={{ margin: '4px 0 0' }}><code>admin</code> | <code>seguridad</code> | <code>residente</code></p>
        </div>

      </div>
    </div>
  );
}