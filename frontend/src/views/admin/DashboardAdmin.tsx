import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Building2, CarFront,
  Clock3, Download, LayoutDashboard, LogOut, Menu, Pencil, Plus, Settings2,
  RefreshCw, Search, ShieldCheck, Trash2, Users, X,
} from 'lucide-react';
import { monitoreoService, usuariosService } from '../../services/api';
import type { AccesoRegistro, UsuarioData } from '../../services/api';
import AdminInfraestructura from './AdminInfraestructura';
import './DashboardAdmin.css';

type Seccion = 'resumen' | 'usuarios' | 'accesos' | 'estacionamientos' | 'configuracion';
type Usuario = UsuarioData & { id: number; fecha_registro?: string };

const FORM_VACIO: UsuarioData = { nombre: '', placa: '', tipo_usuario: 'Residente', estatus: 'Activo' };

export default function DashboardAdmin() {
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [accesos, setAccesos] = useState<AccesoRegistro[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [cargandoAccesos, setCargandoAccesos] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState('');
  const [errorAccesos, setErrorAccesos] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroAcceso, setFiltroAcceso] = useState('Todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<UsuarioData>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [menuMovil, setMenuMovil] = useState(false);
  const [maxVisitantes, setMaxVisitantes] = useState(() => Number(localStorage.getItem('guardia_max_visitor_vehicles')) || 2);
  const [configGuardada, setConfigGuardada] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    setCargandoUsuarios(true);
    setErrorUsuarios('');
    try {
      const resultado = await usuariosService.obtenerTodos();
      if (!Array.isArray(resultado)) throw new Error(resultado?.error_detalle || 'La respuesta de usuarios no es válida.');
      setUsuarios(resultado);
    } catch {
      setErrorUsuarios('No se pudieron cargar los usuarios. Confirma que la API esté disponible.');
    } finally {
      setCargandoUsuarios(false);
    }
  }, []);

  const cargarAccesos = useCallback(async () => {
    setCargandoAccesos(true);
    setErrorAccesos('');
    try {
      const resultado = await monitoreoService.obtenerHistorial(200);
      if (!Array.isArray(resultado)) throw new Error('La respuesta de accesos no es válida.');
      setAccesos(resultado);
    } catch {
      setErrorAccesos('No se pudo cargar el historial. Confirma que el backend tenga disponible /api/monitoreo/historial.');
    } finally {
      setCargandoAccesos(false);
    }
  }, []);

  const actualizar = useCallback(() => {
    void Promise.all([cargarUsuarios(), cargarAccesos()]);
  }, [cargarAccesos, cargarUsuarios]);

  useEffect(() => { actualizar(); }, [actualizar]);

  const usuariosFiltrados = useMemo(() => usuarios.filter((usuario) => {
    const termino = busqueda.trim().toLowerCase();
    const coincideTexto = !termino || `${usuario.nombre} ${usuario.placa}`.toLowerCase().includes(termino);
    const coincideTipo = filtroTipo === 'Todos' || usuario.tipo_usuario === filtroTipo;
    return coincideTexto && coincideTipo;
  }), [usuarios, busqueda, filtroTipo]);

  const accesosFiltrados = useMemo(() => accesos.filter((acceso) => {
    const termino = busqueda.trim().toLowerCase();
    const coincideTexto = !termino || `${acceso.placa_detectada} ${acceso.marca_detectada || ''}`.toLowerCase().includes(termino);
    const coincideEstado = filtroAcceso === 'Todos' || (filtroAcceso === 'Concedidos' ? acceso.acceso_concedido : !acceso.acceso_concedido);
    return coincideTexto && coincideEstado;
  }), [accesos, busqueda, filtroAcceso]);

  const hoy = new Date().toISOString().slice(0, 10);
  const accesosHoy = accesos.filter((acceso) => acceso.fecha === hoy).length;
  const accesosConcedidos = accesos.filter((acceso) => acceso.acceso_concedido).length;
  const accesosDenegados = accesos.length - accesosConcedidos;
  const apiStatus = cargandoUsuarios || cargandoAccesos ? 'Conectando…' : errorUsuarios || errorAccesos ? 'Conexión parcial' : 'API conectada';
  const apiDisponible = !cargandoUsuarios && !cargandoAccesos && !errorUsuarios && !errorAccesos;

  const abrirNuevoUsuario = () => {
    setUsuarioEditando(null);
    setForm(FORM_VACIO);
    setMensaje('');
    setModalAbierto(true);
  };

  const abrirEdicion = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setForm({ nombre: usuario.nombre, placa: usuario.placa, tipo_usuario: usuario.tipo_usuario, estatus: usuario.estatus });
    setMensaje('');
    setModalAbierto(true);
  };

  const guardarUsuario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGuardando(true);
    setMensaje('');
    try {
      const datos = { ...form, nombre: form.nombre.trim(), placa: form.placa.trim().toUpperCase() };
      if (usuarioEditando) await usuariosService.actualizar(usuarioEditando.id, datos);
      else await usuariosService.crear(datos);
      setModalAbierto(false);
      await cargarUsuarios();
    } catch {
      setMensaje('No se pudo guardar. Revisa la conexión y confirma que la placa no esté registrada.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarUsuario = async (usuario: Usuario) => {
    if (!window.confirm(`¿Eliminar a ${usuario.nombre} (${usuario.placa})?`)) return;
    try {
      await usuariosService.eliminar(usuario.id);
      await cargarUsuarios();
    } catch {
      setErrorUsuarios('No se pudo eliminar el usuario. Intenta de nuevo.');
    }
  };

  const exportarAccesos = () => {
    const encabezados = ['ID', 'Placa', 'Fecha', 'Hora', 'Resultado', 'Marca', 'Color', 'Foto'];
    const filas = accesosFiltrados.map((acceso) => [acceso.id, acceso.placa_detectada, acceso.fecha, acceso.hora, acceso.acceso_concedido ? 'Concedido' : 'Denegado', acceso.marca_detectada || '', acceso.color_detectado || '', acceso.foto_path || '']);
    const csv = [encabezados, ...filas].map((fila) => fila.map((valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    enlace.download = 'historial-accesos.csv';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  };

  const salir = () => {
    localStorage.removeItem('user_rol');
    localStorage.removeItem('username');
    window.location.assign('/');
  };

  const guardarConfiguracion = () => {
    localStorage.setItem('guardia_max_visitor_vehicles', String(maxVisitantes));
    setConfigGuardada(true);
    window.setTimeout(() => setConfigGuardada(false), 3500);
  };

  const irA = (destino: Seccion) => {
    setSeccion(destino);
    setBusqueda('');
    setMenuMovil(false);
  };

  const titulo = seccion === 'usuarios' ? 'Usuarios' : seccion === 'accesos' ? 'Logs de entrada' : seccion === 'estacionamientos' ? 'Estacionamientos' : seccion === 'configuracion' ? 'Configuración' : 'Resumen general';

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${menuMovil ? 'sidebar-open' : ''}`}>
        <div className="admin-brand"><span className="admin-brand-icon"><ShieldCheck size={21} /></span><span>Guard<span>IA</span></span><button className="mobile-close" onClick={() => setMenuMovil(false)} aria-label="Cerrar menú"><X size={19} /></button></div>
        <p className="sidebar-caption">PLATAFORMA</p>
        <nav className="admin-nav" aria-label="Navegación de administración">
          <button className={seccion === 'resumen' ? 'active' : ''} onClick={() => irA('resumen')}><LayoutDashboard size={18} />Resumen</button>
          <button className={seccion === 'usuarios' ? 'active' : ''} onClick={() => irA('usuarios')}><Users size={18} />Usuarios <span className="nav-count">{usuarios.length}</span></button>
          <button className={seccion === 'accesos' ? 'active' : ''} onClick={() => irA('accesos')}><Activity size={18} />Logs de entrada</button>
          <button className={seccion === 'estacionamientos' ? 'active' : ''} onClick={() => irA('estacionamientos')}><Building2 size={18} />Estacionamientos</button>
          <button className={seccion === 'configuracion' ? 'active' : ''} onClick={() => irA('configuracion')}><Settings2 size={18} />Configuración</button>
        </nav>
        <div className="sidebar-bottom"><div className="admin-profile"><span className="profile-avatar">A</span><div><b>Administrador</b><small>Control total</small></div></div><button className="logout-button" onClick={salir}><LogOut size={17} />Cerrar sesión</button></div>
      </aside>

      {menuMovil && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMenuMovil(false)} />}

      <main className="admin-main">
        <header className="admin-topbar"><button className="menu-toggle" onClick={() => setMenuMovil(true)} aria-label="Abrir menú"><Menu size={21} /></button><div className="breadcrumb">GuardIA <span>/</span> <b>{titulo}</b></div><div className="topbar-actions"><span className={`system-status ${apiDisponible ? '' : 'status-warning'}`}><i />{apiStatus}</span><button className="refresh-button" onClick={actualizar} aria-label="Actualizar datos"><RefreshCw size={17} /></button><span className="topbar-avatar">A</span></div></header>

        <div className="admin-content">
          <div className="page-heading"><div><span className="page-kicker">PANEL DE ADMINISTRACIÓN</span><h1>{titulo}</h1><p>Gestiona usuarios y supervisa la actividad de acceso del recinto.</p></div>{seccion === 'usuarios' && <button className="primary-action" onClick={abrirNuevoUsuario}><Plus size={17} />Nuevo usuario</button>}</div>

          {seccion === 'resumen' && <>
            <section className="metric-grid" aria-label="Indicadores de administración">
              <MetricCard title="Usuarios registrados" value={cargandoUsuarios ? '—' : usuarios.length} icon={<Users size={19} />} tone="blue" detail="Cuentas y vehículos" />
              <MetricCard title="Accesos hoy" value={cargandoAccesos ? '—' : accesosHoy} icon={<CarFront size={20} />} tone="violet" detail="Intentos registrados" />
              <MetricCard title="Accesos concedidos" value={cargandoAccesos ? '—' : accesosConcedidos} icon={<ArrowDownLeft size={19} />} tone="green" detail="En el historial cargado" />
              <MetricCard title="Accesos denegados" value={cargandoAccesos ? '—' : accesosDenegados} icon={<ArrowUpRight size={19} />} tone="amber" detail="En el historial cargado" />
            </section>
            <section className="admin-panel overview-panel"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Últimos registros de entrada</p></div><button className="subtle-action" onClick={() => irA('accesos')}>Ver historial <ArrowRight size={15} /></button></div><AccessTable rows={accesos.slice(0, 6)} loading={cargandoAccesos} error={errorAccesos} compact /></section>
            <section className="admin-panel overview-panel"><div className="panel-heading"><div><h2>Usuarios</h2><p>Acceso rápido a los usuarios registrados</p></div><button className="subtle-action" onClick={() => irA('usuarios')}>Ver usuarios <ArrowRight size={15} /></button></div><UserTable rows={usuarios.slice(0, 5)} loading={cargandoUsuarios} error={errorUsuarios} onEdit={abrirEdicion} onDelete={eliminarUsuario} /></section>
          </>}

          {seccion === 'usuarios' && <section className="admin-panel full-panel"><div className="panel-heading"><div><h2>Directorio de usuarios</h2><p>{usuarios.length} registros en el sistema</p></div><button className="icon-action" onClick={cargarUsuarios} aria-label="Actualizar usuarios"><RefreshCw size={16} /></button></div><div className="table-toolbar"><label className="search-box"><Search size={17} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por nombre o placa" /></label><label className="select-filter"><span>Tipo:</span><select value={filtroTipo} onChange={(event) => setFiltroTipo(event.target.value)}><option>Todos</option><option>Residente</option><option>Visitante</option></select></label></div><UserTable rows={usuariosFiltrados} loading={cargandoUsuarios} error={errorUsuarios} onEdit={abrirEdicion} onDelete={eliminarUsuario} /></section>}

          {seccion === 'accesos' && <section className="admin-panel full-panel"><div className="panel-heading"><div><h2>Historial de entradas</h2><p>Se muestran hasta 200 registros recientes</p></div><button className="export-button" onClick={exportarAccesos}><Download size={16} />Exportar CSV</button></div><div className="table-toolbar"><label className="search-box"><Search size={17} /><input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar por placa o marca" /></label><label className="select-filter"><span>Resultado:</span><select value={filtroAcceso} onChange={(event) => setFiltroAcceso(event.target.value)}><option>Todos</option><option>Concedidos</option><option>Denegados</option></select></label><button className="icon-action" onClick={cargarAccesos} aria-label="Actualizar historial"><RefreshCw size={16} /></button></div><AccessTable rows={accesosFiltrados} loading={cargandoAccesos} error={errorAccesos} /></section>}

          {seccion === 'estacionamientos' && <AdminInfraestructura />}

          {seccion === 'configuracion' && <section className="admin-panel admin-settings-panel"><div className="panel-heading"><div><h2>Reglas de visitantes</h2><p>Define cuántos pases temporales puede mantener un residente activos a la vez.</p></div></div><div className="setting-row"><div className="setting-description"><span className="setting-icon"><Users size={18} /></span><div><b>Máximo de vehículos visitantes</b><p>El límite inicial es 2. Al guardarlo, se comparte con el portal de residentes en este navegador.</p></div></div><label className="setting-input"><span>Vehículos</span><input type="number" min={1} max={20} value={maxVisitantes} onChange={(event) => setMaxVisitantes(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} /></label></div><div className="settings-footer"><p>{configGuardada ? 'Configuración guardada.' : 'Este ajuste todavía se guarda localmente; falta persistirlo en la configuración del servidor.'}</p><button className="primary-action" onClick={guardarConfiguracion}><ShieldCheck size={16} />Guardar configuración</button></div></section>}
          <footer className="admin-footer"><span>GuardIA · Administración de accesos</span><span>Panel de control</span></footer>
        </div>
      </main>

      {modalAbierto && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalAbierto(false); }}><section className="user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title"><div className="modal-heading"><div><span className="page-kicker">GESTIÓN DE CUENTAS</span><h2 id="user-modal-title">{usuarioEditando ? 'Editar usuario' : 'Nuevo usuario'}</h2></div><button className="icon-action" onClick={() => setModalAbierto(false)} aria-label="Cerrar"><X size={18} /></button></div>{mensaje && <p className="modal-error" role="alert">{mensaje}</p>}<form className="user-form" onSubmit={guardarUsuario}><label>Nombre completo<input required maxLength={100} value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} placeholder="Nombre del usuario" /></label><label>Placa del vehículo<input required maxLength={15} value={form.placa} onChange={(event) => setForm({ ...form, placa: event.target.value.toUpperCase() })} placeholder="ABC123" /></label><div className="modal-form-row"><label>Tipo de usuario<select value={form.tipo_usuario} onChange={(event) => setForm({ ...form, tipo_usuario: event.target.value as UsuarioData['tipo_usuario'] })}><option value="Residente">Residente</option><option value="Visitante">Visitante</option></select></label><label>Estatus<select value={form.estatus} onChange={(event) => setForm({ ...form, estatus: event.target.value as UsuarioData['estatus'] })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></label></div><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModalAbierto(false)}>Cancelar</button><button type="submit" className="primary-action" disabled={guardando}>{guardando ? 'Guardando…' : usuarioEditando ? 'Guardar cambios' : 'Registrar usuario'}</button></div></form></section></div>}
    </div>
  );
}

function MetricCard({ title, value, detail, icon, tone }: { title: string; value: string | number; detail: string; icon: ReactNode; tone: string }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><span className="metric-detail">{detail}</span><p>{title}</p><strong>{value}</strong></article>;
}

function UserTable({ rows, loading, error, onEdit, onDelete }: { rows: Usuario[]; loading: boolean; error: string; onEdit: (usuario: Usuario) => void; onDelete: (usuario: Usuario) => void }) {
  if (loading) return <TableState icon={<Users size={22} />} text="Cargando usuarios…" />;
  if (error) return <TableState icon={<Users size={22} />} text={error} />;
  if (!rows.length) return <TableState icon={<Users size={22} />} text="No hay usuarios que coincidan con la búsqueda." />;
  return <div className="table-scroll"><table className="admin-table"><thead><tr><th>USUARIO</th><th>PLACA</th><th>TIPO</th><th>ESTATUS</th><th>REGISTRO</th><th aria-label="Acciones" /></tr></thead><tbody>{rows.map((usuario) => <tr key={usuario.id}><td><div className="user-cell"><span className="user-initial">{usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}</span><span><b>{usuario.nombre}</b><small>ID #{usuario.id}</small></span></div></td><td><span className="plate-chip">{usuario.placa}</span></td><td>{usuario.tipo_usuario}</td><td><span className={`status-pill ${usuario.estatus === 'Activo' ? 'status-active' : 'status-inactive'}`}><i />{usuario.estatus}</span></td><td>{formatDate(usuario.fecha_registro)}</td><td><div className="row-actions"><button onClick={() => onEdit(usuario)} aria-label={`Editar ${usuario.nombre}`} title="Editar"><Pencil size={15} /></button><button onClick={() => onDelete(usuario)} aria-label={`Eliminar ${usuario.nombre}`} title="Eliminar"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>;
}

function AccessTable({ rows, loading, error, compact = false }: { rows: AccesoRegistro[]; loading: boolean; error: string; compact?: boolean }) {
  if (loading) return <TableState icon={<Activity size={22} />} text="Cargando historial…" />;
  if (error) return <TableState icon={<Activity size={22} />} text={error} />;
  if (!rows.length) return <TableState icon={<Activity size={22} />} text="Todavía no hay registros de acceso." />;
  return <div className="table-scroll"><table className="admin-table access-table"><thead><tr><th>PLACA</th><th>FECHA Y HORA</th><th>VEHÍCULO</th><th>RESULTADO</th>{!compact && <th>EVIDENCIA</th>}</tr></thead><tbody>{rows.map((acceso) => <tr key={acceso.id}><td><span className="plate-chip">{acceso.placa_detectada}</span></td><td><span className="date-cell"><b>{formatDate(acceso.fecha)}</b><small><Clock3 size={12} />{String(acceso.hora || '').slice(0, 8)}</small></span></td><td>{[acceso.color_detectado, acceso.marca_detectada].filter(Boolean).join(' · ') || <span className="muted-dash">Sin datos</span>}</td><td><span className={`status-pill ${acceso.acceso_concedido ? 'status-active' : 'status-inactive'}`}><i />{acceso.acceso_concedido ? 'Concedido' : 'Denegado'}</span></td>{!compact && <td>{acceso.foto_path ? <span className="evidence-path" title={acceso.foto_path}>{acceso.foto_path.split(/[\\/]/).pop()}</span> : <span className="muted-dash">—</span>}</td>}</tr>)}</tbody></table></div>;
}

function TableState({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="table-state"><span>{icon}</span><p>{text}</p></div>;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
