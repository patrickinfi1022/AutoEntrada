import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw, VideoOff } from 'lucide-react';
import './CameraWebRTCPlayer.css';

export interface CameraWebRTCPlayerProps {
  cameraId: string;
  accessToken: string;
  title?: string;
  apiBaseUrl?: string;
  iceServers?: RTCIceServer[];
  onStateChange?: (state: PlayerState) => void;
}

type PlayerState = 'connecting' | 'live' | 'reconnecting' | 'error';

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

export default function CameraWebRTCPlayer({
  cameraId,
  accessToken,
  title = 'Cámara en vivo',
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  iceServers = DEFAULT_ICE,
  onStateChange,
}: CameraWebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const attemptsRef = useRef(0);
  const aliveRef = useRef(false);
  const [playerState, setPlayerState] = useState<PlayerState>('connecting');
  const [error, setError] = useState('');
  const [retryNumber, setRetryNumber] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => { onStateChange?.(playerState); }, [onStateChange, playerState]);

  useEffect(() => {
    aliveRef.current = true;
    attemptsRef.current = 0;
    let reconnectScheduled = false;

    const deleteSession = (keepalive = false) => {
      const sessionUrl = sessionUrlRef.current;
      sessionUrlRef.current = null;
      if (!sessionUrl) return;
      void fetch(sessionUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
        keepalive,
      }).catch(() => undefined);
    };

    const closePeer = (removeSession = true) => {
      const peer = peerRef.current;
      peerRef.current = null;
      if (peer) {
        peer.ontrack = null;
        peer.onconnectionstatechange = null;
        peer.close();
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (removeSession) deleteSession();
    };

    const scheduleReconnect = () => {
      if (!aliveRef.current || reconnectScheduled) return;
      reconnectScheduled = true;
      attemptsRef.current += 1;
      const waitMs = Math.min(1000 * (2 ** Math.min(attemptsRef.current - 1, 3)), 8000);
      setRetryNumber(attemptsRef.current);
      setPlayerState('reconnecting');
      retryTimerRef.current = window.setTimeout(() => {
        reconnectScheduled = false;
        retryTimerRef.current = null;
        void connect();
      }, waitMs);
    };

    const connect = async () => {
      if (!aliveRef.current) return;
      closePeer();
      setPlayerState(attemptsRef.current > 0 ? 'reconnecting' : 'connecting');
      setError('');

      let peer: RTCPeerConnection | null = null;
      try {
        const connection = new RTCPeerConnection({ iceServers });
        peer = connection;
        peerRef.current = connection;
        connection.ontrack = (event) => {
          if (videoRef.current) {
            videoRef.current.srcObject = event.streams[0] || new MediaStream([event.track]);
            void videoRef.current.play().catch(() => undefined);
          }
        };
        connection.onconnectionstatechange = () => {
          if (!aliveRef.current || peerRef.current !== connection) return;
          if (connection.connectionState === 'connected') {
            if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
            reconnectScheduled = false;
            attemptsRef.current = 0;
            setRetryNumber(0);
            setPlayerState('live');
          } else if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
            scheduleReconnect();
          }
        };

        const videoTransceiver = connection.addTransceiver('video', { direction: 'recvonly' });
        const h264Codecs = RTCRtpReceiver.getCapabilities('video')?.codecs.filter(
          (codec) => codec.mimeType.toLowerCase() === 'video/h264',
        ) || [];
        if (!h264Codecs.length) throw new Error('Este navegador no ofrece compatibilidad con H.264 para video WebRTC.');
        videoTransceiver.setCodecPreferences(h264Codecs);

        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await waitForIceGathering(connection, 5000);
        if (!connection.localDescription?.sdp) throw new Error('No se pudo preparar la oferta WebRTC.');

        const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/api/cameras/${encodeURIComponent(cameraId)}/whep`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/sdp',
            Accept: 'application/sdp',
          },
          body: connection.localDescription.sdp,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { detail?: string } | null;
          if (response.status === 401 || response.status === 403) {
            closePeer();
            setError('Tu sesión no tiene permiso para ver esta cámara.');
            setPlayerState('error');
            return;
          }
          throw new Error(payload?.detail || 'El servidor no pudo iniciar el video.');
        }

        const sessionLocation = response.headers.get('Location');
        if (sessionLocation) sessionUrlRef.current = new URL(sessionLocation, apiBaseUrl).toString();
        if (!aliveRef.current || peerRef.current !== peer) {
          deleteSession(true);
          closePeer(false);
          return;
        }
        const answer = await response.text();
        await connection.setRemoteDescription({ type: 'answer', sdp: answer });
      } catch (cause) {
        if (peerRef.current === peer) closePeer();
        if (!aliveRef.current) return;
        const message = cause instanceof Error ? cause.message : 'No se pudo establecer la conexión de video.';
        setError(message);
        setPlayerState('error');
        scheduleReconnect();
      }
    };

    void connect();
    return () => {
      aliveRef.current = false;
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
      closePeer(true);
    };
  }, [accessToken, apiBaseUrl, cameraId, iceServers, restartKey]);

  const retryNow = () => {
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    setError('');
    setPlayerState('connecting');
    attemptsRef.current = 0;
    setRetryNumber(0);
    setRestartKey((value) => value + 1);
  };

  return (
    <section className="webrtc-player" aria-label={title}>
      <div className="webrtc-player-heading"><div><VideoOff size={16} /><b>{title}</b></div><span className={`webrtc-state ${playerState}`}><i />{stateLabel(playerState)}</span></div>
      <div className="webrtc-video-frame">
        <video ref={videoRef} autoPlay playsInline muted />
        {playerState !== 'live' && <div className="webrtc-overlay"><span className={`webrtc-overlay-icon ${playerState}`}>{playerState === 'connecting' || playerState === 'reconnecting' ? <LoaderCircle size={23} /> : <AlertTriangle size={23} />}</span><b>{playerState === 'connecting' ? 'Conectando con la cámara…' : playerState === 'reconnecting' ? 'Reconectando transmisión…' : 'Video no disponible'}</b><p>{error || (playerState === 'reconnecting' ? `Nuevo intento ${retryNumber}` : 'La conexión WebRTC puede tardar unos segundos.')}</p>{playerState === 'error' && <button onClick={retryNow}><RefreshCw size={14} />Reintentar</button>}</div>}
        {playerState === 'live' && <span className="webrtc-live-tag"><i />EN VIVO</span>}
      </div>
    </section>
  );
}

function stateLabel(state: PlayerState) {
  if (state === 'live') return 'En vivo';
  if (state === 'reconnecting') return 'Reconectando';
  if (state === 'error') return 'Sin señal';
  return 'Conectando';
}

function waitForIceGathering(peer: RTCPeerConnection, timeoutMs: number) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise<void>((resolve) => {
    let timeout = 0;
    const done = () => {
      window.clearTimeout(timeout);
      peer.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => { if (peer.iceGatheringState === 'complete') done(); };
    peer.addEventListener('icegatheringstatechange', onChange);
    timeout = window.setTimeout(done, timeoutMs);
  });
}
