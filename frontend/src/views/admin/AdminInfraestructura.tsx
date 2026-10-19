import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Building2, Check, Copy, LoaderCircle, Plus, RefreshCw, Router, Trash2, Video } from 'lucide-react';
import { camerasService, sitesService } from '../../services/api';
import type { CameraCreateData, CameraSummary, EdgeGatewaySummary, ParkingSite, SiteMember } from '../../services/api';
import './AdminInfraestructura.css';

const emptyCamera: CameraCreateData = { label: '', host: '', rtsp_username: '', rtsp_password: '', channel: 101 };
const getAccessToken = () => localStorage.getItem('access_token') || '';

export default function AdminInfraestructura() {
  const [sites, setSites] = useState<ParkingSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [edges, setEdges] = useState<EdgeGatewaySummary[]>([]);
  const [cameras, setCameras] = useState<CameraSummary[]>([]);
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [siteName, setSiteName] = useState('');
  const [edgeName, setEdgeName] = useState('');
  const [mediaApiUrl, setMediaApiUrl] = useState('');
  const [memberSubject, setMemberSubject] = useState('');
  const [memberRole, setMemberRole] = useState<SiteMember['role']>('Seguridad');
  const [camera, setCamera] = useState<CameraCreateData>(emptyCamera);
  const [issuedToken, setIssuedToken] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSites = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const result = await sitesService.listar(token);
    setSites(result);
    setSelectedSiteId((current) => current && result.some((site) => site.id === current) ? current : result[0]?.id || '');
  }, []);

  const loadResources = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !selectedSiteId) { setEdges([]); setCameras([]); setMembers([]); return; }
    const [gatewayResult, cameraResult, memberResult] = await Promise.all([
      sitesService.listarGateways(selectedSiteId, token),
      camerasService.listar(token),
      sitesService.listarMiembros(selectedSiteId, token),
    ]);
    setEdges(gatewayResult);
    setCameras(cameraResult.filter((item) => item.site_id === selectedSiteId));
    setMembers(memberResult);
  }, [selectedSiteId]);

  useEffect(() => { void loadSites().catch(() => setError('No se pudieron cargar los estacionamientos. Verifica tu sesión y la API.')); }, [loadSites]);
  useEffect(() => { void loadResources().catch(() => setError('No se pudieron cargar los gateways y cámaras del sitio.')); }, [loadResources]);

  const withBusy = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch { setError('La operación no se completó. Revisa la API y los datos del formulario.'); }
    finally { setBusy(false); }
  };

  const createSite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void withBusy(async () => {
      const created = await sitesService.crear({ name: siteName.trim(), timezone: 'America/Mexico_City' }, getAccessToken());
      setSiteName('');
      await loadSites();
      setSelectedSiteId(created.id);
      setNotice('Estacionamiento creado.');
    });
  };

  const enrollEdge = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSiteId) { setError('Crea o selecciona un estacionamiento primero.'); return; }
    void withBusy(async () => {
      const result = await sitesService.enrolarGateway(selectedSiteId, { name: edgeName.trim(), media_api_url: mediaApiUrl.trim() }, getAccessToken());
      setIssuedToken(result.edge_token);
      setEdgeName(''); setMediaApiUrl('');
      await loadResources();
      setNotice('Gateway enrolado. Copia el token y guárdalo en el gateway; solo se muestra esta vez.');
    });
  };

  const rotateToken = (edgeId: string) => {
    if (!selectedSiteId) return;
    void withBusy(async () => {
      const result = await sitesService.rotarTokenGateway(selectedSiteId, edgeId, getAccessToken());
      setIssuedToken(result.edge_token);
      setNotice('Token rotado. El gateway dejará de reportar hasta que actualices su secreto local.');
      await loadResources();
    });
  };

  const addMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSiteId) return;
    void withBusy(async () => {
      await sitesService.asignarMiembro(selectedSiteId, { subject: memberSubject.trim(), role: memberRole }, getAccessToken());
      setMemberSubject('');
      await loadResources();
      setNotice('Acceso al sitio asignado.');
    });
  };

  const removeMember = (subject: string) => {
    if (!selectedSiteId) return;
    void withBusy(async () => {
      await sitesService.quitarMiembro(selectedSiteId, subject, getAccessToken());
      await loadResources();
      setNotice('Acceso al sitio retirado.');
    });
  };

  const registerCamera = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSiteId) { setError('Selecciona un estacionamiento.'); return; }
    if (!edges.some((edge) => edge.id === camera.gateway_id)) { setError('Selecciona un gateway de este estacionamiento.'); return; }
    void withBusy(async () => {
      await camerasService.registrar({ ...camera, label: camera.label.trim(), host: camera.host.trim(), rtsp_username: camera.rtsp_username.trim(), site_id: selectedSiteId }, getAccessToken());
      setCamera(emptyCamera);
      await loadResources();
      setNotice('Cámara registrada. El backend la aprovisionó en el gateway del sitio.');
    });
  };

  if (!getAccessToken()) return <section className="admin-panel full-panel"><div className="panel-heading"><div><h2>Infraestructura de video</h2><p>Estacionamientos, gateways y cámaras IP</p></div></div><div className="table-state"><span><AlertTriangle size={22} /></span><p>Esta sesión no tiene un token de administrador conectado a la API. Configura el proveedor de identidad antes de usar esta sección.</p></div></section>;

  return <div className="admin-infrastructure">
    {error && <p className="infra-notice error" role="alert"><AlertTriangle size={15} />{error}</p>}
    {notice && <p className="infra-notice success" role="status"><Check size={15} />{notice}</p>}
    <section className="admin-panel full-panel">
      <div className="panel-heading"><div><h2><Building2 size={17} /> Estacionamientos</h2><p>Cada empresa organiza sus gateways y cámaras por sitio.</p></div><button className="icon-action" onClick={() => void withBusy(async () => { await loadSites(); await loadResources(); })} aria-label="Actualizar sitios"><RefreshCw size={16} /></button></div>
      <div className="infra-two-column">
        <label className="infra-field">Sitio activo<select value={selectedSiteId} onChange={(event) => setSelectedSiteId(event.target.value)}><option value="">Selecciona un estacionamiento</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
        <form className="infra-inline-form" onSubmit={createSite}><label className="infra-field">Nuevo estacionamiento<input required minLength={2} maxLength={120} value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Nombre del sitio" /></label><button className="primary-action" disabled={busy}><Plus size={15} />Crear sitio</button></form>
      </div>
    </section>

    <section className="admin-panel full-panel">
      <div className="panel-heading"><div><h2>Acceso al estacionamiento</h2><p>Asigna personas por el identificador `sub` de tu proveedor de identidad.</p></div><span className="infra-count">{members.length} miembros</span></div>
      <form className="infra-form-grid member-form" onSubmit={addMember}>
        <label className="infra-field">Identificador de usuario (sub)<input required maxLength={128} value={memberSubject} onChange={(event) => setMemberSubject(event.target.value)} placeholder="ID del usuario en OIDC" /></label>
        <label className="infra-field">Rol en este sitio<select value={memberRole} onChange={(event) => setMemberRole(event.target.value as SiteMember['role'])}><option value="Seguridad">Seguridad</option><option value="Usuario">Usuario</option></select></label>
        <button className="primary-action" disabled={busy || !selectedSiteId}><Plus size={15} />Asignar acceso</button>
      </form>
      {members.length > 0 && <div className="infra-edge-list">{members.map((member) => <div className="infra-resource-row" key={member.subject}><b>{member.subject}</b><span className="infra-count">{member.role}</span><button className="icon-action" type="button" disabled={busy} onClick={() => removeMember(member.subject)} aria-label={`Retirar ${member.subject}`}><Trash2 size={14} /></button></div>)}</div>}
    </section>

    <section className="admin-panel full-panel">
      <div className="panel-heading"><div><h2><Router size={17} /> Gateway local</h2><p>Equipo Linux en la LAN del estacionamiento; el control se comunica por VPN privada.</p></div><span className="infra-count">{edges.length} gateways</span></div>
      <form className="infra-form-grid" onSubmit={enrollEdge}>
        <label className="infra-field">Nombre del gateway<input required minLength={2} maxLength={120} value={edgeName} onChange={(event) => setEdgeName(event.target.value)} placeholder="Caseta norte" /></label>
        <label className="infra-field">API privada del gateway<input required type="url" value={mediaApiUrl} onChange={(event) => setMediaApiUrl(event.target.value)} placeholder="http://10.80.0.12:1984" /></label>
        <button className="primary-action" disabled={busy || !selectedSiteId}>{busy ? <LoaderCircle size={15} /> : <Plus size={15} />}Enrolar gateway</button>
      </form>
      {issuedToken && <div className="edge-token-box"><div><b>Token de enrolamiento</b><small>Se muestra una vez. Guárdalo únicamente en el equipo gateway.</small></div><code>{issuedToken}</code><button className="icon-action" onClick={() => void navigator.clipboard.writeText(issuedToken)} aria-label="Copiar token"><Copy size={15} /></button></div>}
      {edges.length > 0 && <div className="infra-edge-list">{edges.map((edge) => <div className="infra-resource-row" key={edge.id}><Router size={16} /><b>{edge.name}</b><span className={`status-pill ${edge.status === 'online' ? 'status-active' : 'status-inactive'}`}><i />{edge.status === 'online' ? 'En línea' : edge.status === 'degraded' ? 'Medios sin señal' : 'Pendiente de conexión'}</span><span>{edge.configured_streams || 0} flujos</span><small>{edge.last_seen_at ? new Date(edge.last_seen_at).toLocaleString('es-MX') : 'Sin heartbeat'}</small><button className="icon-action" type="button" disabled={busy} onClick={() => rotateToken(edge.id)} title="Rotar token y volver a enrolar" aria-label={`Rotar token de ${edge.name}`}><RefreshCw size={14} /></button></div>)}</div>}
    </section>

    <section className="admin-panel full-panel">
      <div className="panel-heading"><div><h2><Video size={17} /> Cámaras IP</h2><p>Las credenciales se envían al backend por HTTPS y se almacenan cifradas.</p></div><span className="infra-count">{cameras.length} cámaras</span></div>
      <form className="infra-form-grid" onSubmit={registerCamera}>
        <label className="infra-field">Nombre<input required maxLength={100} value={camera.label} onChange={(event) => setCamera({ ...camera, label: event.target.value })} placeholder="Acceso principal" /></label>
        <label className="infra-field">IP local de cámara<input required type="text" inputMode="decimal" value={camera.host} onChange={(event) => setCamera({ ...camera, host: event.target.value })} placeholder="192.168.1.50" /></label>
        <label className="infra-field">Gateway<select required value={camera.gateway_id || ''} onChange={(event) => setCamera({ ...camera, gateway_id: event.target.value })}><option value="">Selecciona gateway</option>{edges.map((edge) => <option key={edge.id} value={edge.id}>{edge.name}</option>)}</select></label>
        <label className="infra-field">Usuario RTSP<input required autoComplete="off" value={camera.rtsp_username} onChange={(event) => setCamera({ ...camera, rtsp_username: event.target.value })} /></label>
        <label className="infra-field">Contraseña RTSP<input required type="password" autoComplete="new-password" value={camera.rtsp_password} onChange={(event) => setCamera({ ...camera, rtsp_password: event.target.value })} /></label>
        <label className="infra-field">Canal<input required type="number" min={101} max={999} value={camera.channel} onChange={(event) => setCamera({ ...camera, channel: Number(event.target.value) })} /></label>
        <button className="primary-action" disabled={busy || !edges.length}>{busy ? <LoaderCircle size={15} /> : <Plus size={15} />}Registrar cámara</button>
      </form>
      {cameras.length > 0 && <div className="infra-edge-list">{cameras.map((item) => <div className="infra-resource-row" key={item.id}><Video size={16} /><b>{item.label}</b><span>Canal {item.channel}</span><small>{edges.find((edge) => edge.id === item.gateway_id)?.name || 'Gateway'}</small></div>)}</div>}
    </section>
  </div>;
}
