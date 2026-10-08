import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import './Login.css';

type Provider = 'Google' | 'Facebook' | 'Apple';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    const account = username.trim().toLowerCase();

    if (!account || !password) {
      setMessage('Ingresa tu usuario y contraseña para continuar.');
      return;
    }

    // Acceso de demostración hasta que el endpoint de autenticación esté conectado.
    const destinations: Record<string, { role: string; path: string }> = {
      admin: { role: 'Admin', path: '/admin' },
      caseta: { role: 'Seguridad', path: '/seguridad' },
      seguridad: { role: 'Seguridad', path: '/seguridad' },
      residente: { role: 'Usuario', path: '/residente' },
      patrick: { role: 'Usuario', path: '/residente' },
    };
    const destination = destinations[account];

    if (!destination) {
      setMessage('No encontramos una cuenta con ese usuario. Verifica tus datos.');
      return;
    }

    localStorage.setItem('user_rol', destination.role);
    localStorage.setItem('username', username.trim());
    window.location.assign(destination.path);
  };

  const handleProvider = (provider: Provider) => {
    setMessage(`El acceso con ${provider} estará disponible cuando se configure la conexión segura de la cuenta.`);
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Acceso a GuardIA">
        <aside className="login-brand-panel">
          <a className="brand-lockup" href="/" aria-label="GuardIA, inicio">
            <span className="brand-mark"><ShieldCheck size={24} strokeWidth={2.1} /></span>
            <span>Guard<span>IA</span></span>
          </a>

          <div className="brand-copy">
            <span className="brand-eyebrow">CONTROL DE ACCESO INTELIGENTE</span>
            <h1>Tu acceso,<br />bajo control.</h1>
            <p>Una forma más segura y sencilla de cuidar lo que más importa.</p>
          </div>

          <div className="access-illustration" aria-hidden="true">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />
            <div className="illustration-gate">
              <div className="gate-top" />
              <div className="gate-post post-left" />
              <div className="gate-post post-right" />
              <div className="gate-arm"><i /><i /><i /><i /><i /></div>
              <div className="gate-base" />
            </div>
            <div className="illustration-car"><span /><i /><b /></div>
            <div className="access-status"><span className="status-dot" /> Acceso protegido</div>
          </div>

          <div className="brand-footer"><span>SEGURIDAD QUE TE DA TRANQUILIDAD</span><span>© 2026 GuardIA</span></div>
        </aside>

        <section className="login-form-panel">
          <div className="mobile-brand"><span className="brand-mark"><ShieldCheck size={22} /></span><b>Guard<span>IA</span></b></div>
          <div className="form-heading">
            <span className="welcome-label">BIENVENIDO DE NUEVO</span>
            <h2>Inicia sesión</h2>
            <p>Ingresa tus datos para acceder a tu cuenta.</p>
          </div>

          {message && <div className="login-message" role="alert">{message}</div>}

          <form className="credentials-form" onSubmit={handleSubmit}>
            <label htmlFor="username">Usuario</label>
            <div className="input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input id="username" name="username" type="text" autoComplete="username" placeholder="Tu usuario" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>

            <div className="password-label-row">
              <label htmlFor="password">Contraseña</label>
              <button className="text-button" type="button" onClick={() => setMessage('Contacta al administrador del sistema para recuperar tu contraseña.')}>¿Olvidaste tu contraseña?</button>
            </div>
            <div className="input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button className="submit-button" type="submit">Entrar <ArrowRight size={18} /></button>
          </form>

          <div className="separator"><span /> <small>o continúa con</small> <span /></div>

          <div className="social-buttons" aria-label="Otras opciones de acceso">
            <button type="button" onClick={() => handleProvider('Google')} aria-label="Continuar con Google"><GoogleMark /><span>Google</span></button>
            <button type="button" onClick={() => handleProvider('Facebook')} aria-label="Continuar con Facebook"><FacebookMark /><span>Facebook</span></button>
            <button type="button" onClick={() => handleProvider('Apple')} aria-label="Continuar con Apple"><AppleMark /><span>Apple</span></button>
          </div>

          <p className="security-note"><LockKeyhole size={14} /> Tus datos están protegidos y cifrados.</p>
          <p className="mobile-footer">¿Necesitas ayuda? <a href="mailto:soporte@guardia.mx">Contacta a soporte</a></p>
        </section>
      </section>
    </main>
  );
}

function GoogleMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.38a4.6 4.6 0 0 1-2 3.02v2.47h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.47c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.06v2.55A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.94a6.02 6.02 0 0 1 0-3.88V7.51H3.06a10 10 0 0 0 0 8.98l3.35-2.55Z"/><path fill="#EA4335" d="M12 5.93c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.95 2.94 14.7 2 12 2a10 10 0 0 0-8.94 5.51l3.35 2.55C7.2 7.69 9.4 5.93 12 5.93Z"/></svg>;
}

function FacebookMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.52-4.66 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.86V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"/></svg>;
}

function AppleMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.05 12.54c.02 2.06 1.81 2.75 1.83 2.76-.01.05-.28.96-.93 1.9-.56.81-1.14 1.62-2.05 1.63-.9.02-1.2-.52-2.24-.52-1.05 0-1.38.5-2.23.54-.89.03-1.57-.88-2.13-1.69-1.16-1.67-2.04-4.72-.85-6.78.59-1.02 1.64-1.67 2.77-1.69.87-.02 1.69.58 2.23.58.53 0 1.54-.72 2.6-.61.45.02 1.72.18 2.54 1.37-.07.04-1.52.89-1.54 2.51ZM15.34 6.99c.47-.57.78-1.36.69-2.15-.67.03-1.49.45-1.97 1.02-.43.5-.81 1.3-.71 2.07.75.06 1.52-.38 1.99-.94Z"/></svg>;
}
