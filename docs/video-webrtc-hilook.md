# Video en vivo HiLook/Hikvision con WebRTC

> Este documento describe el modo de desarrollo de una sola red. Para despliegue SaaS con varios estacionamientos usa el plano de control y gateway por sitio descritos en [produccion-saas-multiestacionamiento.md](./produccion-saas-multiestacionamiento.md).

## Arquitectura

```text
Navegador HTTPS
  ├─ POST/DELETE /api/cameras/{id}/whep ──► FastAPI
  │                                           ├─ valida JWT y tenant
  │                                           └─ proxy SDP ──► go2rtc:1984 (red privada)
  └─ ICE/DTLS-SRTP por UDP/TCP 8555 ◄───────────────────► go2rtc

DVR HiLook/Hikvision ── RTSP/TCP H.264 ──► go2rtc
```

FastAPI genera un nombre opaco por stream. La contraseña RTSP se cifra con Fernet en MySQL y solo se descifra/enuncia al registrar el source en go2rtc; el navegador recibe el ID público de cámara, el SDP y una ruta WHEP opaca para cerrar la sesión. El puerto de la API go2rtc (1984) queda ligado a loopback en el host y no debe publicarse en Internet.

go2rtc expone WHEP mediante `POST /api/webrtc?src=<stream>` y administra fuentes con `PUT /api/streams?name=<stream>&src=<rtsp>`. La señalización se proxya con FastAPI; después del SDP, el tráfico de medios usa WebRTC directamente por ICE/DTLS-SRTP al puerto 8555. [API oficial go2rtc](https://github.com/AlexxIT/go2rtc/blob/master/website/api/openapi.yaml), [ejemplo Docker oficial](https://github.com/AlexxIT/go2rtc/blob/master/docker/README.md).

## DVR HiLook DVR-104G-K1

Configura el canal en H.264 y desactiva H.265+/Smart Codec. Para el stream principal, FastAPI forma internamente:

```text
rtsp://<usuario>:<password>@<ip>:554/Streaming/Channels/101#transport=tcp#media=video
```

El stream 101 suele ser el canal principal; utiliza 102 para el substream si está configurado en el DVR. El source usa el cliente RTSP nativo de go2rtc, transporte TCP y solo video, y conserva los paquetes H.264 sin transcodificación. El reproductor limita los codecs WebRTC ofrecidos a H.264. La configuración utiliza la sintaxis de parámetros RTSP (`transport`, `media`) y negociación de codecs documentada por go2rtc. [Cliente RTSP](https://github.com/AlexxIT/go2rtc/blob/master/internal/rtsp/rtsp.go), [codecs y FFmpeg](https://github.com/AlexxIT/go2rtc/blob/master/internal/ffmpeg/README.md).

## Arranque

1. Copia `.env.video.example` a `.env.video` y configura `GO2RTC_PUBLIC_IP`, `JWT_SECRET`, `CAMERA_CREDENTIALS_KEY`, `GO2RTC_API_URL`, `JWT_ISSUER`, `JWT_AUDIENCE` y `CORS_ORIGINS`. Para FastAPI, añade también esas variables a `backend/.env` sin reemplazar `DATABASE_URL` ni las variables de la base actual.
2. Genera claves independientes. Con el entorno del backend: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Genera también `JWT_SECRET` con al menos 32 bytes aleatorios.
3. Ejecuta una vez la migración `backend/migrations/20261008_add_camera_streams.sql` en MySQL.
4. Instala las dependencias de `backend/requirements.txt` y arranca el stack de video: `docker compose --env-file .env.video -f docker-compose.video.yml up -d`.
5. Arranca FastAPI desde el backend. En desarrollo local, `GO2RTC_API_URL=http://127.0.0.1:1984`; si FastAPI también corre en Docker, únelo a `autoentrada-media-backplane` y usa `http://go2rtc:1984`.
6. Abre 8555/TCP y 8555/UDP en el firewall hacia el host go2rtc. Publica FastAPI detrás de HTTPS y configura el dominio/IP pública del host de medios en `GO2RTC_PUBLIC_IP`.

No expongas 1984, no habilites la UI de go2rtc a usuarios finales y no guardes credenciales RTSP en `go2rtc.yaml`, URLs frontend, logs o repositorio.

## Endpoints FastAPI

- `POST /api/cameras` (rol `Admin`): recibe `label`, `host` IPv4/IPv6 privada, `rtsp_username`, `rtsp_password` y `channel` (101–999). Crea el source dinámico y cifra la contraseña antes de guardarla.
- `GET /api/cameras` (cualquier rol autenticado): enumera cámaras del tenant sin incluir host ni credenciales.
- `POST /api/cameras/{camera_id}/whep` (tenant autenticado): recibe oferta SDP `application/sdp` y proxya a go2rtc. Devuelve el SDP answer y una cabecera `Location` local.
- `DELETE /api/cameras/{camera_id}/whep/{session_id}` (tenant autenticado): elimina la sesión WHEP del servidor de medios.
- `DELETE /api/cameras/{camera_id}` (rol `Admin`): elimina el stream y el registro.

Los JWT deben ser HS256 y traer `sub`, `tenant_id`, `role`, `exp`, y opcionalmente `iss`/`aud` que coincidan con configuración. **El login del proyecto todavía es una simulación local y no emite JWT**: conecta primero el servicio de identidad real para que estas rutas puedan usarse. No sustituyas el JWT por `tenant_id` enviado en body, query o una cabecera elegida por el navegador.

## Player React

`frontend/src/components/CameraWebRTCPlayer.tsx` es reutilizable:

```tsx
<CameraWebRTCPlayer
  cameraId={camera.id}
  accessToken={accessToken}
  title={camera.label}
  apiBaseUrl="https://api.example.com"
  iceServers={[
    { urls: "stun:stun.cloudflare.com:3478" },
    // Configura TURN con credenciales temporales para redes restrictivas.
  ]}
/>
```

El componente fuerza H.264 en la oferta, muestra conexión/error, reconecta con backoff y elimina la sesión WHEP al desmontarse.

## Escala y latencia

- <1 s no se puede garantizar: depende del GOP/keyframe del DVR, jitter, RTT, carga del host, NAT y si ICE necesita TURN. H.264 passthrough evita el retardo y CPU de recodificar; configura GOP corto en el DVR y desactiva B-frames/Smart Codec si el equipo ofrece esos controles.
- El servidor SaaS debe tener ruta IP hacia la LAN del DVR. En instalaciones detrás de NAT, no apuntes el servidor cloud a `192.168.x.x`: instala un edge connector en el recinto o una VPN site-to-site. No publiques el RTSP del DVR directamente.
- Para conexiones que no aceptan UDP directo, usa TURN (por ejemplo coturn o un proveedor administrado), genera credenciales TURN efímeras por usuario y publícalas en `iceServers`; no incluyas secretos TURN estáticos en el bundle frontend.
- Para alta disponibilidad, usa múltiples nodos go2rtc y enruta cada cámara/sesión a su nodo propietario. Comparte MySQL y cifrado mediante un KMS/Vault; no compartas stream IDs entre tenants. Añade límites por tenant, cuotas, auditoría y limpieza periódica de sesiones expiradas.
- El código añade almacenamiento y proxy WHEP, pero el token issuer, KMS, TURN, edge connector, cuotas, scheduler de limpieza y despliegue TLS son decisiones de infraestructura pendientes del SaaS.
