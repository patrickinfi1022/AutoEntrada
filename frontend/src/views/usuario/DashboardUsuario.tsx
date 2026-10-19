import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowRight, BadgeCheck, CarFront,
  Clock3, CreditCard, FileText, Home, LogOut, Menu, Plus, Search,
  ShieldCheck, Ticket, UserRound, Wallet, X,
} from 'lucide-react';
import './DashboardUsuario.css';

type Section = 'inicio' | 'vehiculos' | 'pases' | 'historial' | 'infracciones';
type TempPass = {
  id: string;
  nombre: string;
  modelo: string;
  color: string;
  placa: string;
  titulo: string;
  creado: string;
  vence: string;
};

const MAX_PASES_DEFAULT = 2;

function storageKey(user: string) { return `guardia_temp_passes_${user.toLowerCase() || 'residente'}`; }

function readPasses(user: string): TempPass[] {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(user)) || '[]') as TempPass[];
    return data.filter((pass) => new Date(pass.vence).getTime() > Date.now());
  } catch { return []; }
}

export default function DashboardUsuario() {
  const username = localStorage.getItem('username') || 'Residente';
  const [section, setSection] = useState<Section>('inicio');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [passes, setPasses] = useState<TempPass[]>(() => readPasses(username));
  const [query, setQuery] = useState('');
  const [showPassForm, setShowPassForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [passName, setPassName] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [title, setTitle] = useState('');
  const [durationHours, setDurationHours] = useState('12');

  const configuredMaximum = Number(localStorage.getItem('guardia_max_visitor_vehicles'));
  const maximumPasses = Number.isInteger(configuredMaximum) && configuredMaximum > 0 ? configuredMaximum : MAX_PASES_DEFAULT;
  const filteredPasses = useMemo(() => passes.filter((pass) => `${pass.nombre} ${pass.placa} ${pass.modelo} ${pass.titulo}`.toLowerCase().includes(query.toLowerCase())), [passes, query]);
  const firstName = username.split(/[ .@_-]/)[0];

  useEffect(() => {
    localStorage.setItem(storageKey(username), JSON.stringify(passes));
  }, [passes, username]);

  const addPass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    if (passes.length >= maximumPasses) {
      setNotice(`Ya tienes el máximo de ${maximumPasses} pases temporales activos.`);
      return;
    }
    const hours = Number(durationHours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
      setNotice('La duración debe estar entre 1 hora y 30 días.');
      return;
    }
    const now = new Date();
    const pass: TempPass = {
      id: crypto.randomUUID(),
      nombre: passName.trim(),
      modelo: model.trim(),
      color: color.trim(),
      placa: plate.trim().toUpperCase(),
      titulo: title.trim(),
      creado: now.toISOString(),
      vence: new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString(),
    };
    setPasses((current) => [pass, ...current]);
    setPassName(''); setModel(''); setColor(''); setPlate(''); setTitle(''); setDurationHours('12');
    setShowPassForm(false);
    setNotice('Pase temporal creado en este navegador. Conecta el backend para autorizarlo en el acceso.');
  };

  const revokePass = (passId: string) => {
    setPasses((current) => current.filter((pass) => pass.id !== passId));
  };

  const logOut = () => {
    localStorage.removeItem('user_rol');
    localStorage.removeItem('username');
    window.location.assign('/');
  };

  const navigate = (target: Section) => { setSection(target); setMobileMenu(false); setQuery(''); };
  const heading = section === 'vehiculos' ? 'Mis vehículos' : section === 'pases' ? 'Pases temporales' : section === 'historial' ? 'Historial de entradas' : section === 'infracciones' ? 'Infracciones' : 'Inicio';

  return (
    <div className="resident-app">
      <aside className={`resident-sidebar ${mobileMenu ? 'resident-sidebar-open' : ''}`}>
        <div className="resident-brand"><a className="resident-brand-link" href="/"><span><ShieldCheck size={21} /></span><b>Guard<span>IA</span></b></a><button className="resident-close-menu" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú"><X size={19} /></button></div>
        <div className="resident-community"><small>MI RECINTO</small><div><span><Home size={16} /></span><b>Portal de residentes</b></div></div>
        <p className="resident-nav-label">MENÚ PRINCIPAL</p>
        <nav className="resident-nav" aria-label="Secciones del portal">
          <NavButton icon={<Home size={17} />} label="Inicio" active={section === 'inicio'} onClick={() => navigate('inicio')} />
          <NavButton icon={<CarFront size={17} />} label="Mis vehículos" active={section === 'vehiculos'} onClick={() => navigate('vehiculos')} />
          <NavButton icon={<Ticket size={17} />} label="Pases temporales" active={section === 'pases'} count={passes.length} onClick={() => navigate('pases')} />
          <NavButton icon={<FileText size={17} />} label="Historial" active={section === 'historial'} onClick={() => navigate('historial')} />
          <NavButton icon={<CreditCard size={17} />} label="Infracciones" active={section === 'infracciones'} onClick={() => navigate('infracciones')} />
        </nav>
        <div className="resident-sidebar-bottom"><div className="resident-user"><span>{firstName.slice(0, 1).toUpperCase()}</span><div><b>{username}</b><small>Cuenta de residente</small></div></div><button className="resident-logout" onClick={logOut}><LogOut size={16} />Cerrar sesión</button></div>
      </aside>
      {mobileMenu && <button className="resident-backdrop" onClick={() => setMobileMenu(false)} aria-label="Cerrar menú" />}

      <main className="resident-main">
        <header className="resident-topbar"><button className="resident-menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Abrir menú"><Menu size={20} /></button><div className="resident-breadcrumb">Portal <span>/</span> <b>{heading}</b></div><div className="resident-top-profile"><span className="resident-online"><i />Cuenta activa</span><span className="resident-avatar">{firstName.slice(0, 1).toUpperCase()}</span></div></header>

        <div className="resident-content">
          <div className="resident-heading"><div><span className="resident-kicker">PORTAL DE RESIDENTES</span><h1>{section === 'inicio' ? `Hola, ${firstName}` : heading}</h1><p>{section === 'inicio' ? 'Aquí puedes consultar tu acceso y administrar tus visitantes.' : section === 'vehiculos' ? 'Información de los vehículos autorizados en tu cuenta.' : section === 'pases' ? 'Administra los accesos temporales de tus visitantes.' : section === 'historial' ? 'Consulta los movimientos de tus vehículos autorizados.' : 'Consulta tus cargos por uso del estacionamiento.'}</p></div>{(section === 'inicio' || section === 'pases') && <button className="resident-primary-button" onClick={() => { setShowPassForm(true); setNotice(''); }} disabled={passes.length >= maximumPasses}><Plus size={17} />Nuevo pase temporal</button>}</div>

          {notice && <div className="resident-notice" role="status"><AlertCircle size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso"><X size={15} /></button></div>}

          {(section === 'inicio' || section === 'vehiculos') && <>
            {section === 'inicio' && <div className="resident-metrics"><Metric icon={<CarFront size={18} />} label="Vehículos autorizados" value="—" detail="Pendiente de vincular" tone="blue" /><Metric icon={<Ticket size={18} />} label="Pases temporales activos" value={`${passes.length} / ${maximumPasses}`} detail="Límite definido por administración" tone="green" /><Metric icon={<AlertTriangle size={18} />} label="Infracciones pendientes" value="—" detail="Consulta no disponible" tone="amber" /></div>}
            <section className="resident-section-card"><div className="resident-section-head"><div className="resident-section-title"><span className="section-icon vehicle"><CarFront size={18} /></span><div><h2>Vehículos autorizados</h2><p>Vehículos permanentes de tu cuenta</p></div></div><span className="resident-count-chip">Límite: {maximumPasses}</span></div><div className="resident-empty"><span><CarFront size={23} /></span><b>No hay vehículos vinculados a esta cuenta</b><p>Solicita a la administración que asocie tu vehículo residente para consultar aquí sus datos y accesos.</p></div></section>
          </>}

          {(section === 'inicio' || section === 'pases') && <section className="resident-section-card pass-section"><div className="resident-section-head"><div className="resident-section-title"><span className="section-icon pass"><Ticket size={17} /></span><div><h2>Visitantes autorizados</h2><p>Pases temporales creados desde esta sesión</p></div></div>{section === 'inicio' && <button className="resident-text-button" onClick={() => navigate('pases')}>Ver todos <ArrowRight size={14} /></button>}</div>{passes.length > 0 && <label className="resident-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar visitante, placa o modelo" /></label>}<PassList passes={section === 'inicio' ? filteredPasses.slice(0, 4) : filteredPasses} onRevoke={revokePass} />{passes.length < maximumPasses && <button className="add-pass-tile" onClick={() => setShowPassForm(true)}><span><Plus size={17} /></span><b>Crear un pase temporal</b><small>Vigencia de 1 hora a 30 días</small></button>}</section>}

          {section === 'historial' && <section className="resident-section-card"><div className="resident-section-head"><div className="resident-section-title"><span className="section-icon history"><Clock3 size={17} /></span><div><h2>Historial de entradas</h2><p>Registros de tus vehículos y visitantes</p></div></div></div><div className="resident-empty"><span><FileText size={23} /></span><b>Historial personal pendiente de conexión</b><p>El sistema todavía no asocia los registros de acceso con la cuenta del residente. No mostramos el historial global para proteger la privacidad de otros usuarios.</p></div></section>}

          {section === 'infracciones' && <section className="resident-section-card"><div className="resident-section-head"><div className="resident-section-title"><span className="section-icon fine"><Wallet size={17} /></span><div><h2>Infracciones y multas</h2><p>Cargos asignados por la administración</p></div></div><span className="fine-total">Saldo: —</span></div><div className="resident-empty fine-empty"><span><BadgeCheck size={23} /></span><b>Sin infracciones pendientes</b><p>Cuando la administración registre una multa, aparecerá aquí con el motivo, monto, fecha y estado de pago.</p></div><div className="payment-info"><CreditCard size={15} /><span>El pago en línea estará disponible cuando se configure la pasarela de pagos.</span></div></section>}

          <div className="resident-data-note"><ShieldCheck size={14} /> Los datos personales y registros deben mostrarse asociados a tu cuenta.</div>
        </div>
      </main>

      {showPassForm && <div className="resident-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPassForm(false); }}><section className="resident-pass-modal" role="dialog" aria-modal="true" aria-labelledby="pass-form-title"><div className="resident-modal-heading"><div><span className="resident-kicker">AUTORIZACIÓN TEMPORAL</span><h2 id="pass-form-title">Nuevo pase de visitante</h2><p>Los campos con * son obligatorios.</p></div><button className="resident-modal-close" onClick={() => setShowPassForm(false)} aria-label="Cerrar"><X size={18} /></button></div><form className="resident-pass-form" onSubmit={addPass}><label className="form-span-two">Nombre del visitante *<input required maxLength={100} value={passName} onChange={(event) => setPassName(event.target.value)} placeholder="Nombre completo" /></label><label>Modelo del vehículo *<input required maxLength={60} value={model} onChange={(event) => setModel(event.target.value)} placeholder="Ej. Versa 2022" /></label><label>Color *<input required maxLength={30} value={color} onChange={(event) => setColor(event.target.value)} placeholder="Ej. Blanco" /></label><label>Placas *<input required maxLength={15} value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} placeholder="ABC123" /></label><label>Título <span className="optional-label">Opcional</span><input maxLength={50} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Visita familiar" /></label><label className="form-span-two">Tiempo de acceso (horas) *<div className="duration-input"><Clock3 size={16} /><input required type="number" min={1} max={720} step={1} value={durationHours} onChange={(event) => setDurationHours(event.target.value)} /><span>horas · máximo 30 días</span></div></label><div className="duration-presets form-span-two"><span>Rápido:</span><button type="button" onClick={() => setDurationHours('1')}>1 h</button><button type="button" onClick={() => setDurationHours('12')}>12 h</button><button type="button" onClick={() => setDurationHours('24')}>24 h</button><button type="button" onClick={() => setDurationHours('168')}>7 días</button><button type="button" onClick={() => setDurationHours('720')}>30 días</button></div><div className="resident-modal-actions form-span-two"><button type="button" className="resident-cancel-button" onClick={() => setShowPassForm(false)}>Cancelar</button><button type="submit" className="resident-primary-button"><Plus size={16} />Crear pase</button></div></form><div className="resident-modal-footnote"><AlertCircle size={14} />La autorización todavía no se envía al sistema de acceso; requiere conectar el servicio de pases.</div></section></div>}
    </div>
  );
}

function NavButton({ icon, label, active, count, onClick }: { icon: ReactNode; label: string; active: boolean; count?: number; onClick: () => void }) {
  return <button className={`resident-nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && count > 0 && <small>{count}</small>}</button>;
}

function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <article className="resident-metric"><span className={`metric-symbol ${tone}`}>{icon}</span><div className="metric-copy"><p>{label}</p><b>{value}</b><small>{detail}</small></div></article>;
}

function PassList({ passes, onRevoke }: { passes: TempPass[]; onRevoke: (id: string) => void }) {
  if (!passes.length) return <div className="resident-empty compact-empty"><span><Ticket size={22} /></span><b>No hay pases temporales activos</b><p>Crea un pase para autorizar a un visitante por tiempo limitado.</p></div>;
  return <div className="pass-list">{passes.map((pass) => <article className="pass-card" key={pass.id}><div className="pass-avatar"><UserRound size={18} /></div><div className="pass-details"><div className="pass-title-row"><b>{pass.nombre}</b><span className="pass-active-pill"><i />Activo</span></div><p>{pass.titulo || 'Visitante'} · {pass.modelo} · {pass.color}</p><div className="pass-meta"><span className="pass-plate">{pass.placa}</span><span><Clock3 size={12} />Vence {formatExpiry(pass.vence)}</span></div></div><button className="revoke-pass" onClick={() => onRevoke(pass.id)} title="Revocar pase" aria-label={`Revocar pase de ${pass.nombre}`}><X size={16} /></button></article>)}</div>;
}

function formatExpiry(value: string) {
  const date = new Date(value);
  const hours = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 3_600_000));
  const when = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
  return hours < 24 ? `${when} (en ${hours} h)` : when;
}
