import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Settings, Building2, Home, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const fillRole = (role: string) => {
    setUsername(role);
    setPassword('demo1234');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const u = username.trim().toLowerCase();

    if (!u || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (u === 'admin') {
      localStorage.setItem('user_rol', 'Admin');
      localStorage.setItem('username', username);
      window.location.href = '/admin';
    } else if (u === 'caseta' || u === 'seguridad') {
      localStorage.setItem('user_rol', 'Seguridad');
      localStorage.setItem('username', username);
      window.location.href = '/seguridad';
    } else if (u === 'residente' || u === 'patrick') {
      localStorage.setItem('user_rol', 'Usuario');
      localStorage.setItem('username', username);
      window.location.href = '/residente';
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  const roles = [
    { label: 'Admin',    value: 'admin',     icon: <Settings size={20} /> },
    { label: 'Caseta',   value: 'seguridad',  icon: <Building2 size={20} /> },
    { label: 'Residente',value: 'residente',  icon: <Home size={20} /> },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: '#f1efe8', padding: '2rem',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)',
        borderRadius: '16px', padding: '2.5rem 2rem', width: '100%', maxWidth: '360px',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', background: '#042C53',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <ShieldCheck size={26} color="#85B7EB" />
          </div>
          <span style={{
            display: 'inline-block', fontSize: 11, padding: '3px 10px',
            borderRadius: 99, background: '#E6F1FB', color: '#185FA5',
            fontWeight: 500, marginBottom: '0.5rem',
          }}>
            Control de acceso
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: '#353e49' }}>GuardIA</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Sistema de acceso vehicular inteligente
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#FCEBEB', border: '1px solid #F09595',
            borderRadius: 8, padding: '10px 12px',
            fontSize: 13, color: '#A32D2D', marginBottom: '1rem',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Usuario */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Usuario</label>
            <InputField
              type="text"
              placeholder="admin, seguridad, residente"
              value={username}
              onChange={setUsername}
              icon={<User size={17} />}
            />
          </div>

          {/* Contraseña */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>Contraseña</label>
            <InputField
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              icon={<Lock size={17} />}
            />
          </div>

          <button type="submit" style={{
            marginTop: '0.5rem', height: 46, background: '#185FA5', color: '#E6F1FB',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <ArrowRight size={16} />
            Iniciar sesión
          </button>
        </form>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '0.5px solid rgba(0,0,0,0.1)', margin: '1.5rem 0 1rem' }} />

        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: '0 0 10px' }}>
          Acceso rápido demo
        </p>

        {/* Role chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {roles.map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => fillRole(r.value)}
              style={{
                background: '#f8fafc', border: '0.5px solid rgba(0,0,0,0.1)',
                borderRadius: 8, padding: '10px 6px', textAlign: 'center',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ color: '#64748b' }}>{r.icon}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{r.label}</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#414549', marginTop: '1rem' }}>
          Usa <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>admin</code>,{' '}
          <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>seguridad</code> o{' '}
          <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>residente</code> con cualquier clave
        </p>
      </div>
    </div>
  );
}

// Subcomponente para inputs con ícono y estado de focus
function InputField({ type, placeholder, value, onChange, icon }: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      height: 46, padding: '0 12px',
      background: focused ? '#fff' : '#f8fafc',
      border: `1.5px solid ${focused ? '#378ADD' : 'rgba(0,0,0,0.15)'}`,
      borderRadius: 8,
      boxShadow: focused ? '0 0 0 3px rgba(55,138,221,0.13)' : 'none',
      transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
    }}>
      <span style={{ color: focused ? '#378ADD' : '#94a3b8', flexShrink: 0, transition: 'color 0.15s' }}>
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          width: '100%', fontSize: 14, color: '#0f172a',
        }}
      />
    </div>
  );
}