# Producción SaaS multiestacionamiento

## Arquitectura objetivo

```text
Navegador HTTPS ──► Frontend/Nginx ──► FastAPI ──► MySQL administrado
       │                                  │
       │ WebRTC / TURN                    │ VPN privada de control
       ▼                                  ▼
     Media ◄── go2rtc en gateway del sitio ──RTSP/H.264── Cámara IP
```

La nube administra empresas, estacionamientos, usuarios, permisos, cámaras y sesiones. Cada sitio instala un gateway Linux con go2rtc. Las cámaras conservan sus IP privadas y el gateway lee RTSP dentro de la LAN. El backend llega a la API privada de go2rtc por la VPN del plano de control; el puerto RTSP de la cámara no se publica en Internet.

## Cambios incluidos en el repositorio

- Tablas `parking_sites` y `edge_gateways`; las cámaras pueden pertenecer a un sitio y un gateway.
- Tabla `site_memberships` y filtros para que Seguridad solo vea cámaras de sitios asignados; Administración conserva el alcance de su tenant.
- API de sitios, enrolamiento de gateways con token aleatorio mostrado una vez, rotación de token y heartbeat con salud/versión del servicio de medios.
- Registro y eliminación de cámaras en el go2rtc del gateway asignado. El backend exige gateway en línea y valida tenant/sitio.
- Panel de administración para crear sitios, enrolar gateways y registrar cámaras IP. Las contraseñas RTSP viajan por HTTPS y permanecen cifradas en MySQL.
- `edge/agent.py` envía heartbeat al SaaS y nunca registra tokens ni URLs RTSP en logs.
- Imágenes Docker para frontend y backend, Nginx para servir la SPA/proxy API y un Compose para el plano cloud. El MySQL se trata como servicio administrado.

## Migración

Aplica en orden, una vez cada archivo, en la base MySQL de la aplicación:

1. `backend/migrations/20261008_add_camera_streams.sql`
2. `backend/migrations/20261009_add_sites_and_edge_gateways.sql`

El segundo archivo añade columnas opcionales a las cámaras existentes. Las cámaras sin sitio quedan visibles solo para Administración hasta que se asignen a un sitio y gateway.

## Despliegue cloud

1. Configura DNS y TLS en el balanceador/ingress del proveedor; `docker-compose.cloud.yml` publica el frontend solo en `127.0.0.1:8080` para que el ingress termine HTTPS.
2. Usa MySQL administrado con backups y restauración probada. Copia `.env.cloud.example` a `.env.cloud` fuera del repositorio y carga los secretos desde el secret manager del proveedor.
3. Configura una red privada del cloud (`autoentrada-site-vpn`) que conecte el backend con los peers WireGuard de los gateways. El valor `media_api_url` debe ser la IP VPN privada del gateway, puerto 1984.
4. Ejecuta las migraciones antes del despliegue. Arranca con `docker compose --env-file .env.cloud -f docker-compose.cloud.yml up -d`.

No expongas 1984 al Internet: el Compose del sitio lo publica exclusivamente en `EDGE_WIREGUARD_IP`. El acceso debe limitarse al backend mediante WireGuard/firewall.

## Alta de un sitio y gateway

1. Un administrador crea el estacionamiento en Administración → Estacionamientos.
2. Enrola el gateway con la dirección VPN que tendrá go2rtc, por ejemplo `http://10.80.0.12:1984`. La API guarda el hash del token y lo devuelve una sola vez con `Cache-Control: no-store`.
3. Copia `.env.edge.example` a `.env.edge` en el gateway Linux. Pon ahí el token entregado, la IP WireGuard y la dirección ICE alcanzable desde el navegador. Protege ese archivo como secreto.
4. Desde la raíz del proyecto en el gateway: `docker compose --env-file .env.edge -f docker-compose.edge.yml up -d --build`. El edge-agent empieza a reportar estado cada 30 segundos.
5. Cuando el estado esté `online`, registra las cámaras del sitio desde el panel. Deben usar IPs reservadas en la LAN del estacionamiento y RTSP/H.264.

El gateway requiere una VPN sitio-a-cloud desplegada y enrutada antes del alta. La configuración de WireGuard se opera fuera de Compose para poder controlar claves, peers y rutas. En una instalación con subredes LAN repetidas, el gateway conserva la conexión local con la cámara y solo se enruta su IP VPN única.

## Tráfico de video

WebRTC transporta los paquetes de video directamente entre peers cuando la red lo permite; STUN ayuda a descubrir rutas y TURN retransmite media cuando hay NAT/firewall restrictivo. La configuración de ejemplo publica TCP/UDP 8555 en una interfaz específica del sitio y usa un candidato ICE configurable. Para sitios sin puertos entrantes disponibles, falta desplegar TURN público y entregar credenciales temporales TURN al reproductor; no habilites el sitio hasta validar esa ruta desde redes móviles y corporativas. [Descripción de WebRTC en go2rtc](https://github.com/AlexxIT/go2rtc/blob/master/internal/webrtc/README.md?plain=1)

## Bloqueos antes de producción pública

- El login del frontend sigue siendo demostrativo y no emite tokens. Hay que integrar OIDC/IdP y mapear `sub`, `tenant_id` y `role` a JWT validado por el backend.
- El verificador actual acepta JWT HS256. El IdP debe emitir un token interno compatible o hay que implementar validación OIDC/JWKS antes de usar tokens RS256 directamente.
- Los routers antiguos de usuarios y monitoreo todavía necesitan autorización y aislamiento tenant/sitio en cada consulta/mutación. No publiques datos reales hasta cerrar esa revisión.
- El edge heartbeat está listo; falta monitor externo de gateways offline, alertas, retención de logs, auditoría y rotación operativa de secretos.
- `docker-compose.cloud.yml` espera que la infraestructura cree previamente la red VPN externa, ingress TLS, MySQL administrado y secret manager.
- El camino de ICE/TURN requiere una prueba en al menos un sitio con CGNAT/firewall estricto y cargas de concurrencia antes de fijar capacidad/precio por cliente.

La ruta directa que ya existía (`GO2RTC_API_URL`) permanece para desarrollo en una sola red. En producción multi-sitio, asigna cada cámara a su sitio/gateway y usa la VPN privada.
