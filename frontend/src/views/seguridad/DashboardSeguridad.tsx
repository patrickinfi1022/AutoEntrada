import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Activity, AlertTriangle, ArrowDownToLine, CalendarDays, Camera, Check, Clock3, DoorOpen,
  History, LockKeyhole, Plus, RefreshCw, Search, Shield, ShieldCheck, ShieldX,
  UserRound, Video, Wifi,
} from 'lucide-react';
import { monitoreoService, usuariosService } from '../../services/api';
import { camerasService } from '../../services/api';
import type { AccesoRegistro, CameraSummary, VisitanteData } from '../../services/api';
import CameraWebRTCPlayer from '../../components/CameraWebRTCPlayer';
import './DashboardSeguridad.css';

type CameraMode = 'usb' | 'red' | 'dvr';
type CameraDevice = { deviceId: string; label: string };

export default function DashboardSeguridad() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('usb');
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [cameraUrl, setCameraUrl] = useState('');
  const [cameraUrlDraft, setCameraUrlDraft] = useState('');
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Selecciona una cámara para iniciar el monitoreo.');
  const [dvrCameras, setDvrCameras] = useState<CameraSummary[]>([]);
  const [selectedDvrCamera, setSelectedDvrCamera] = useState('');
  const [loadingDvrCameras, setLoadingDvrCameras] = useState(false);
  const [dvrPlayerState, setDvrPlayerState] = useState<'connecting' | 'live' | 'reconnecting' | 'error'>('connecting');
  const [streamError, setStreamError] = useState(false);
  const [logs, setLogs] = useState<AccesoRegistro[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [search, setSearch] = useState('');
  const [visitor, setVisitor] = useState<VisitanteData>({ nombre: '', placa: '', vigencia: '12h' });
  const [savingVisitor, setSavingVisitor] = useState(false);
  const [visitorNotice, setVisitorNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'success' | 'error'>('success');
  const [gateNotice, setGateNotice] = useState('');

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogsError('');
    try {
      const result = await monitoreoService.obtenerHistorial(200);
      if (!Array.isArray(result)) throw new Error('Respuesta inválida');
      setLogs(result);
    } catch {
      setLogsError('No se pudo cargar el historial. Verifica la conexión con el servidor.');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const listDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const cameras = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Cámara ${index + 1}` }));
      setDevices(cameras);
      if (!selectedDevice && cameras.length) setSelectedDevice(cameras[0].deviceId);
    } catch {
      setCameraMessage('No fue posible consultar las cámaras disponibles.');
    }
  }, [selectedDevice]);

  useEffect(() => {
    void loadLogs();
    void listDevices();
    const interval = window.setInterval(() => { void loadLogs(); }, 15000);
    return () => {
      window.clearInterval(interval);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [loadLogs, listDevices]);

  const loadDvrCameras = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setDvrCameras([]);
      setCameraMessage('La sesión actual no tiene token de acceso. Conecta el inicio de sesión con la API para cargar cámaras DVR.');
      return;
    }
    setLoadingDvrCameras(true);
    try {
      const cameras = await camerasService.listar(accessToken);
      setDvrCameras(cameras);
      setSelectedDvrCamera((current) => current && cameras.some((camera) => camera.id === current) ? current : cameras[0]?.id || '');
      setCameraMessage(cameras.length ? 'Selecciona una cámara DVR registrada.' : 'No hay cámaras DVR registradas para esta estación. Un administrador debe registrar el DVR primero.');
    } catch {
      setDvrCameras([]);
      setCameraMessage('No fue posible consultar las cámaras. Verifica la sesión y la conexión con la API.');
    } finally {
      setLoadingDvrCameras(false);
    }
  }, []);

  useEffect(() => {
    if (cameraMode === 'dvr') void loadDvrCameras();
  }, [cameraMode, loadDvrCameras]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraConnected, cameraMode]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraConnected(false);
    setCameraUrl('');
    setStreamError(false);
    setCameraMessage('Cámara desconectada.');
  };

  const connectUsb = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage('El navegador requiere HTTPS o localhost para acceder a la cámara.');
      return;
    }
    setCameraLoading(true);
    setCameraMessage('Solicitando permiso para usar la cámara…');
    setStreamError(false);
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const videoConstraint: MediaTrackConstraints = selectedDevice
        ? { deviceId: { exact: selectedDevice } }
        : { facingMode: 'environment' };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
      streamRef.current = stream;
      setCameraMode('usb');
      setCameraConnected(true);
      setCameraMessage('Cámara conectada y lista para monitorear.');
      const cameras = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput').map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Cámara ${index + 1}` }));
      setDevices(cameras);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraMessage('No se pudo abrir la cámara. Revisa permisos, conexión USB o si otra aplicación la está usando.');
      setStreamError(true);
    } finally {
      setCameraLoading(false);
    }
  };

  const connectNetworkCamera = () => {
    const rawUrl = cameraUrlDraft.trim();
    let parsedUrl: URL;
    try { parsedUrl = new URL(rawUrl); } catch { setCameraMessage('Ingresa una URL de video válida.'); setStreamError(true); return; }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      setCameraMessage('El navegador no reproduce RTSP directamente. Usa una URL HTTP/MJPEG o conecta el DVR mediante un gateway de video.');
      setStreamError(true);
      return;
    }
    setCameraUrl(rawUrl);
    setCameraConnected(true);
    setStreamError(false);
    setCameraMessage('Conectando al flujo HTTP de la cámara…');
  };

  const saveVisitor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingVisitor(true);
    setVisitorNotice('');
    try {
      await usuariosService.crearVisitante({ ...visitor, nombre: visitor.nombre.trim(), placa: visitor.placa.trim().toUpperCase() });
      setVisitor({ nombre: '', placa: '', vigencia: '12h' });
      setNoticeKind('success');
      setVisitorNotice('Visitante registrado. Su pase expira según la vigencia elegida.');
      void loadLogs();
    } catch {
      setNoticeKind('error');
      setVisitorNotice('No se pudo registrar. Revisa que la placa no esté registrada y que el servidor esté disponible.');
    } finally {
      setSavingVisitor(false);
    }
  };

  const requestGateOpen = () => {
    setGateNotice('La apertura física aún no está conectada. Configura el relevador o la API del DVR para accionar la pluma.');
  };

  const selectMode = (mode: CameraMode) => {
    if (cameraConnected) stopCamera();
    setCameraMode(mode);
    setStreamError(false);
    setCameraMessage(mode === 'usb' ? 'Selecciona una cámara USB y pulsa Conectar.' : mode === 'red' ? 'Ingresa la URL HTTP/MJPEG de la cámara de red.' : 'Ingresa la URL HTTP/MJPEG que expone tu DVR/NVR.');
  };

  const filteredLogs = logs.filter((log) => !search || `${log.placa_detectada} ${log.marca_detectada || ''} ${log.color_detectado || ''}`.toLowerCase().includes(search.toLowerCase()));
  const grantedToday = logs.filter((log) => log.fecha === new Date().toISOString().slice(0, 10) && log.acceso_concedido).length;
  const deniedToday = logs.filter((log) => log.fecha === new Date().toISOString().slice(0, 10) && !log.acceso_concedido).length;
  const hasAccessToken = Boolean(localStorage.getItem('access_token'));
  const dvrStatus = !hasAccessToken ? 'Sesión requerida' : !selectedDvrCamera ? 'Sin configurar' : dvrPlayerState === 'live' ? 'Conectada' : dvrPlayerState === 'error' ? 'Sin señal' : 'Conectando';

  return (
    <main className="security-console">
      <header className="security-header">
        <div className="security-brand"><span className="security-brand-mark"><ShieldCheck size={22} /></span><div><b>Guard<span>IA</span></b><small>ESTACIÓN DE SEGURIDAD</small></div></div>
        <div className="security-live-status"><i /> Consola de monitoreo</div>
        <button className="security-refresh" onClick={() => void loadLogs()} aria-label="Actualizar registros"><RefreshCw size={16} /></button>
      </header>

      <div className="security-content">
        <div className="security-page-title"><div><span className="security-eyebrow">CONTROL DE ACCESO VEHICULAR</span><h1>Monitoreo de entrada</h1><p>Supervisa la cámara, registra visitantes y consulta el historial.</p></div><div className="security-date"><CalendarLabel />{new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</div></div>

        <section className="security-workspace">
          <article className="camera-card">
            <div className="camera-card-heading"><div><span className="card-icon"><Video size={17} /></span><div><h2>Cámara de acceso</h2><p>Visualización en vivo de la entrada</p></div></div><span className={`camera-connection ${(cameraMode === 'dvr' ? dvrPlayerState === 'live' : cameraConnected && !streamError) ? 'connected' : ''}`}><i />{cameraMode === 'dvr' ? dvrStatus : cameraConnected && !streamError ? 'Conectada' : 'Sin conexión'}</span></div>
            <div className={`camera-view ${streamError ? 'camera-error' : ''}`}>
              {cameraMode === 'dvr' && selectedDvrCamera && localStorage.getItem('access_token') && <CameraWebRTCPlayer key={selectedDvrCamera} cameraId={selectedDvrCamera} accessToken={localStorage.getItem('access_token') || ''} title={dvrCameras.find((camera) => camera.id === selectedDvrCamera)?.label || 'Cámara DVR'} onStateChange={setDvrPlayerState} />}
              {cameraMode === 'usb' && cameraConnected && <video ref={videoRef} autoPlay playsInline muted />}
              {cameraMode === 'red' && cameraConnected && !streamError && <img src={cameraUrl} alt="Flujo de la cámara de red" onLoad={() => setCameraMessage('Flujo de cámara recibido.')} onError={() => { setStreamError(true); setCameraMessage('No se pudo mostrar el flujo. Verifica la URL y que el dispositivo permita acceso HTTP desde este navegador.'); }} />}
              {((cameraMode === 'usb' && !cameraConnected) || (cameraMode === 'red' && (!cameraConnected || streamError)) || (cameraMode === 'dvr' && (!selectedDvrCamera || !localStorage.getItem('access_token')))) && <div className="camera-placeholder"><span className="camera-placeholder-icon">{streamError ? <AlertTriangle size={25} /> : <Camera size={26} />}</span><b>{streamError ? 'No se recibió video' : 'Vista de cámara'}</b><p>{cameraMessage}</p></div>}
            </div>
            <div className="camera-controls">
              <div className="camera-mode-tabs" role="tablist" aria-label="Tipo de cámara"><button className={cameraMode === 'usb' ? 'selected' : ''} onClick={() => selectMode('usb')}><Camera size={15} />USB</button><button className={cameraMode === 'red' ? 'selected' : ''} onClick={() => selectMode('red')}><Wifi size={15} />Red</button><button className={cameraMode === 'dvr' ? 'selected' : ''} onClick={() => selectMode('dvr')}><Video size={15} />DVR / NVR</button></div>
              {cameraMode === 'usb' ? <div className="camera-connect-row"><select aria-label="Seleccionar cámara USB" value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)}><option value="">Cámara predeterminada</option>{devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select><button className="camera-connect-button" onClick={cameraConnected ? stopCamera : connectUsb} disabled={cameraLoading}>{cameraLoading ? 'Conectando…' : cameraConnected ? 'Desconectar' : 'Conectar cámara'}</button></div> : cameraMode === 'red' ? <div className="camera-connect-row"><input aria-label="URL del flujo HTTP de cámara" type="url" value={cameraUrlDraft} onChange={(event) => setCameraUrlDraft(event.target.value)} placeholder="http://192.168.1.50:8080/video" /><button className="camera-connect-button" onClick={cameraConnected ? stopCamera : connectNetworkCamera}>{cameraConnected ? 'Desconectar' : 'Conectar'}</button></div> : <div className="camera-connect-row"><select aria-label="Seleccionar cámara DVR registrada" value={selectedDvrCamera} onChange={(event) => setSelectedDvrCamera(event.target.value)} disabled={loadingDvrCameras || !dvrCameras.length}><option value="">{loadingDvrCameras ? 'Cargando cámaras…' : 'Selecciona una cámara DVR'}</option>{dvrCameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.label} · canal {camera.channel}</option>)}</select><button className="camera-connect-button" onClick={() => void loadDvrCameras()} disabled={loadingDvrCameras}>{loadingDvrCameras ? 'Cargando…' : 'Actualizar'}</button></div>}
              <p className="camera-hint">{cameraMode === 'usb' ? 'Permite el acceso del navegador y conecta la cámara por USB.' : cameraMode === 'red' ? 'Compatible con flujos HTTP/MJPEG. El navegador no reproduce RTSP directamente.' : 'El video RTSP se retransmite por WebRTC desde go2rtc; registra la cámara en la API como administrador.'}</p>
            </div>
          </article>

          <aside className="security-side-column">
            <section className="gate-card"><div className="side-card-title"><span className="gate-icon"><DoorOpen size={19} /></span><div><h2>Control de pluma</h2><p>Accionamiento manual de acceso</p></div></div><div className="gate-state"><span className="gate-state-icon"><LockKeyhole size={17} /></span><div><b>Control no conectado</b><small>Requiere relevador o integración DVR</small></div></div><button className="gate-open-button" onClick={requestGateOpen}><DoorOpen size={17} />Abrir pluma</button>{gateNotice && <p className="gate-notice" role="status"><AlertTriangle size={14} />{gateNotice}</p>}</section>

            <section className="visitor-card"><div className="side-card-title"><span className="visitor-icon"><UserRound size={18} /></span><div><h2>Registro de visitantes</h2><p>Pase temporal · No crea usuarios permanentes</p></div></div>{visitorNotice && <p className={`visitor-notice ${noticeKind}`} role="status">{noticeKind === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}{visitorNotice}</p>}<form className="visitor-form" onSubmit={saveVisitor}><label>Nombre del visitante<input required maxLength={100} value={visitor.nombre} onChange={(event) => setVisitor({ ...visitor, nombre: event.target.value })} placeholder="Nombre completo" /></label><label>Placa del vehículo<input required maxLength={15} value={visitor.placa} onChange={(event) => setVisitor({ ...visitor, placa: event.target.value.toUpperCase() })} placeholder="ABC123" /></label><label>Vigencia del pase<select value={visitor.vigencia} onChange={(event) => setVisitor({ ...visitor, vigencia: event.target.value as VisitanteData['vigencia'] })}><option value="12h">12 horas</option><option value="24h">24 horas</option><option value="7d">7 días</option></select></label><button className="visitor-submit" type="submit" disabled={savingVisitor}><Plus size={16} />{savingVisitor ? 'Registrando…' : 'Registrar visitante'}</button></form><div className="visitor-permission"><Shield size={14} />Permiso de seguridad: altas temporales únicamente</div></section>
          </aside>
        </section>

        <section className="security-logs-card"><div className="logs-heading"><div className="side-card-title"><span className="logs-icon"><History size={18} /></span><div><h2>Logs de entrada</h2><p>Consulta de solo lectura · Actualización automática cada 15 segundos</p></div></div><div className="logs-totals"><span><i className="granted-dot" />{grantedToday} concedidos hoy</span><span><i className="denied-dot" />{deniedToday} denegados hoy</span></div></div><div className="logs-toolbar"><label className="logs-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por placa, marca o color" /></label><button className="logs-refresh" onClick={() => void loadLogs()} aria-label="Actualizar logs"><RefreshCw size={15} /></button></div><LogsTable logs={filteredLogs} loading={loadingLogs} error={logsError} /></section>

        <footer className="security-footer"><span><ShieldCheck size={14} /> Estación de seguridad</span><span>Los logs son de solo lectura para este perfil</span></footer>
      </div>
    </main>
  );
}

function LogsTable({ logs, loading, error }: { logs: AccesoRegistro[]; loading: boolean; error: string }) {
  if (loading) return <div className="logs-empty"><Activity size={21} /><span>Cargando registros de acceso…</span></div>;
  if (error) return <div className="logs-empty error"><AlertTriangle size={21} /><span>{error}</span></div>;
  if (!logs.length) return <div className="logs-empty"><History size={21} /><span>No hay registros que coincidan.</span></div>;
  return <div className="logs-table-scroll"><table className="security-logs-table"><thead><tr><th>RESULTADO</th><th>PLACA</th><th>FECHA Y HORA</th><th>VEHÍCULO</th><th>FOTO</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><span className={`log-result ${log.acceso_concedido ? 'granted' : 'denied'}`}>{log.acceso_concedido ? <ShieldCheck size={14} /> : <ShieldX size={14} />}{log.acceso_concedido ? 'Concedido' : 'Denegado'}</span></td><td><span className="security-plate">{log.placa_detectada}</span></td><td><span className="log-datetime"><b>{formatAccessDate(log.fecha)}</b><small><Clock3 size={12} />{String(log.hora || '').slice(0, 8)}</small></span></td><td>{[log.color_detectado, log.marca_detectada].filter(Boolean).join(' · ') || '—'}</td><td>{log.foto_path ? <span className="log-photo" title={log.foto_path}><ArrowDownToLine size={13} />{log.foto_path.split(/[\\/]/).pop()}</span> : '—'}</td></tr>)}</tbody></table></div>;
}

function formatAccessDate(value: string) {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function CalendarLabel() {
  return <CalendarDays size={15} />;
}
