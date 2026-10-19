import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ParkingSquare, ShieldCheck, UserRound } from 'lucide-react';
import './Register.css';

type LegalDocument = 'términos y condiciones' | 'aviso de privacidad';

export default function Register() {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [codigoEstacionamiento, setCodigoEstacionamiento] = useState('');
  const [aceptaLegal, setAceptaLegal] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMensaje('');
    if (!aceptaLegal) {
      setMensaje('Debes aceptar los términos y el aviso de privacidad para continuar.');
      return;
    }

    // El backend aún no tiene un endpoint para crear cuentas.
    setMensaje('Tu información está lista. El registro se habilitará cuando conectemos el servicio de cuentas.');
  };

  const showLegalNotice = (document: LegalDocument) => {
    setMensaje(`El documento de ${document} debe publicarse antes de habilitar el registro de cuentas.`);
  };

  return (
    <main className="login-page register-page">
      <section className="login-shell register-shell" aria-label="Crear una cuenta de GuardIA">
        <aside className="login-brand-panel">
          <Link className="brand-lockup" to="/" aria-label="GuardIA, inicio">
            <span className="brand-mark"><ShieldCheck size={24} strokeWidth={2.1} /></span>
            <span>Guard<span>IA</span></span>
          </Link>

          <div className="brand-copy">
            <span className="brand-eyebrow">TU ESPACIO, MÁS SEGURO</span>
            <h1>Bienvenido<br />a casa.</h1>
            <p>Crea tu cuenta para administrar tus accesos y registrar visitantes.</p>
          </div>

          <div className="register-benefits">
            <div><span><ShieldCheck size={16} /></span><p><b>Acceso seguro</b><small>Control desde una sola cuenta</small></p></div>
            <div><span><ParkingSquare size={16} /></span><p><b>Tu estacionamiento</b><small>Vincula tu código de residente</small></p></div>
          </div>
          <div className="brand-footer"><span>SEGURIDAD QUE TE DA TRANQUILIDAD</span><span>© 2026 GuardIA</span></div>
        </aside>

        <section className="login-form-panel register-form-panel">
          <div className="mobile-brand"><span className="brand-mark"><ShieldCheck size={22} /></span><b>Guard<span>IA</span></b></div>
          <div className="form-heading register-heading">
            <span className="welcome-label">EMPIEZA EN UN MOMENTO</span>
            <h2>Crea tu cuenta</h2>
            <p>Completa tus datos para solicitar acceso al portal.</p>
          </div>

          {mensaje && <div className="login-message" role="alert">{mensaje}</div>}

          <form className="credentials-form register-form" onSubmit={handleSubmit}>
            <div className="register-name-row">
              <div className="register-field">
                <label htmlFor="nombre">Nombre</label>
                <div className="input-wrap"><UserRound size={17} aria-hidden="true" /><input id="nombre" name="given-name" type="text" autoComplete="given-name" placeholder="Tu nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} required /></div>
              </div>
              <div className="register-field">
                <label htmlFor="apellido">Apellido</label>
                <div className="input-wrap"><UserRound size={17} aria-hidden="true" /><input id="apellido" name="family-name" type="text" autoComplete="family-name" placeholder="Tu apellido" value={apellido} onChange={(event) => setApellido(event.target.value)} required /></div>
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="correo">Correo electrónico</label>
              <div className="input-wrap"><Mail size={17} aria-hidden="true" /><input id="correo" name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" value={correo} onChange={(event) => setCorreo(event.target.value)} required /></div>
            </div>

            <div className="register-field">
              <label htmlFor="contrasena">Contraseña</label>
              <div className="input-wrap"><LockKeyhole size={17} aria-hidden="true" /><input id="contrasena" name="new-password" type={mostrarContrasena ? 'text' : 'password'} autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" value={contrasena} onChange={(event) => setContrasena(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setMostrarContrasena((visible) => !visible)} aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              <small className="field-hint">Usa al menos 8 caracteres.</small>
            </div>

            <div className="register-field">
              <label htmlFor="codigo-estacionamiento">Código de estacionamiento</label>
              <div className="input-wrap"><ParkingSquare size={17} aria-hidden="true" /><input id="codigo-estacionamiento" name="parking-code" type="text" autoComplete="off" placeholder="Ej. TORRE-A-204" value={codigoEstacionamiento} onChange={(event) => setCodigoEstacionamiento(event.target.value)} required /></div>
              <small className="field-hint">Solicítalo a la administración de tu recinto.</small>
            </div>

            <div className="legal-consent">
              <input id="acepta-legal" type="checkbox" checked={aceptaLegal} onChange={(event) => setAceptaLegal(event.target.checked)} required />
              <span><label htmlFor="acepta-legal">He leído y acepto los</label> <button type="button" onClick={() => showLegalNotice('términos y condiciones')}>Términos y condiciones</button> y el <button type="button" onClick={() => showLegalNotice('aviso de privacidad')}>Aviso de privacidad</button>.</span>
            </div>

            <button className="submit-button" type="submit">Crear cuenta <ArrowRight size={18} /></button>
          </form>

          <p className="register-login-prompt">¿Ya tienes una cuenta? <Link to="/">Inicia sesión</Link></p>
          <p className="register-security-note"><LockKeyhole size={14} /> Tu información se maneja de forma segura.</p>
        </section>
      </section>
    </main>
  );
}
