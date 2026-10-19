// src/services/api.ts
import axios from 'axios';

// Instancia global de Axios apuntando al puerto de FastAPI
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- SERVICIOS PARA EL MÓDULO DE USUARIOS (ADMIN / SEGURIDAD) ---

export interface UsuarioData {
  nombre: string;
  placa: string;
  tipo_usuario: 'Residente' | 'Visitante';
  estatus: 'Activo' | 'Inactivo';
}

export interface VisitanteData {
  nombre: string;
  placa: string;
  vigencia: '12h' | '24h' | '7d';
}

export interface UsuarioRegistro extends UsuarioData {
  id: number;
  fecha_registro?: string;
}

export interface AccesoRegistro {
  id: number;
  placa_detectada: string;
  fecha: string;
  hora: string;
  foto_path: string;
  color_detectado?: string | null;
  marca_detectada?: string | null;
  acceso_concedido: boolean;
}

export interface CameraSummary {
  id: string;
  label: string;
  channel: number;
  created_at: string;
  site_id?: string | null;
  gateway_id?: string | null;
}

export interface CameraCreateData {
  label: string;
  host: string;
  rtsp_username: string;
  rtsp_password: string;
  channel: number;
  site_id?: string;
  gateway_id?: string;
}

export const camerasService = {
  listar: async (accessToken: string): Promise<CameraSummary[]> => {
    const respuesta = await api.get('/api/cameras', { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },

  registrar: async (camera: CameraCreateData, accessToken: string): Promise<CameraSummary> => {
    const respuesta = await api.post('/api/cameras', camera, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },

  eliminar: async (cameraId: string, accessToken: string): Promise<void> => {
    await api.delete(`/api/cameras/${encodeURIComponent(cameraId)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  },
};

export interface ParkingSite {
  id: string;
  name: string;
  timezone: string;
  status: string;
}

export interface EdgeGatewaySummary {
  id: string;
  name: string;
  status: 'pending' | 'online' | 'offline' | string;
  last_seen_at?: string | null;
  configured_streams?: number;
  media_version?: string | null;
}

export interface SiteMember {
  subject: string;
  role: 'Seguridad' | 'Usuario';
}

export const sitesService = {
  listar: async (accessToken: string): Promise<ParkingSite[]> => {
    const respuesta = await api.get('/api/sites', { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  crear: async (site: { name: string; timezone: string }, accessToken: string): Promise<ParkingSite> => {
    const respuesta = await api.post('/api/sites', site, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  listarGateways: async (siteId: string, accessToken: string): Promise<EdgeGatewaySummary[]> => {
    const respuesta = await api.get(`/api/sites/${encodeURIComponent(siteId)}/edges`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  enrolarGateway: async (siteId: string, gateway: { name: string; media_api_url: string }, accessToken: string): Promise<EdgeGatewaySummary & { edge_token: string }> => {
    const respuesta = await api.post(`/api/sites/${encodeURIComponent(siteId)}/edges`, gateway, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  rotarTokenGateway: async (siteId: string, edgeId: string, accessToken: string): Promise<EdgeGatewaySummary & { edge_token: string }> => {
    const respuesta = await api.post(`/api/sites/${encodeURIComponent(siteId)}/edges/${encodeURIComponent(edgeId)}/rotate-token`, {}, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  listarMiembros: async (siteId: string, accessToken: string): Promise<SiteMember[]> => {
    const respuesta = await api.get(`/api/sites/${encodeURIComponent(siteId)}/members`, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  asignarMiembro: async (siteId: string, member: SiteMember, accessToken: string): Promise<SiteMember> => {
    const respuesta = await api.post(`/api/sites/${encodeURIComponent(siteId)}/members`, member, { headers: { Authorization: `Bearer ${accessToken}` } });
    return respuesta.data;
  },
  quitarMiembro: async (siteId: string, subject: string, accessToken: string): Promise<void> => {
    await api.delete(`/api/sites/${encodeURIComponent(siteId)}/members/${encodeURIComponent(subject)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  },
};

export const usuariosService = {
  // Obtener todos los usuarios de la base de datos
  obtenerTodos: async () => {
    const respuesta = await api.get('/api/usuarios');
    return respuesta.data;
  },

  // Registrar un nuevo residente o visitante
  crear: async (usuario: UsuarioData) => {
    const respuesta = await api.post('/api/usuarios', usuario);
    return respuesta.data;
  },

  crearVisitante: async (visitante: VisitanteData) => {
    const respuesta = await api.post('/api/usuarios/visitantes', visitante);
    return respuesta.data;
  },

  actualizar: async (id: number, usuario: UsuarioData) => {
    const respuesta = await api.put(`/api/usuarios/${id}`, usuario);
    return respuesta.data;
  },

  eliminar: async (id: number) => {
    const respuesta = await api.delete(`/api/usuarios/${id}`);
    return respuesta.data;
  },
};

// --- SERVICIOS PARA EL MÓDULO DE MONITOREO E IA ---

export const monitoreoService = {
  obtenerHistorial: async (limit = 200) => {
    const respuesta = await api.get('/api/monitoreo/historial', { params: { limit } });
    return respuesta.data;
  },

  simularDeteccion: async (placa: string) => {
    // Enviamos 'null' como body y pasamos la placa en el objeto params
    const respuesta = await api.post('/api/monitoreo/simular-deteccion', null, {
      params: { 
        placa: placa,
        color: 'Gris',
        marca: 'Desconocida'
      }
    });
    return respuesta.data;
  },
};

export const authService = {
  login: async (username: string, clave: string) => {
    // Necesitaremos crear este endpoint en FastAPI
    const respuesta = await api.post('/api/auth/login', { username, clave });
    return respuesta.data;
  }
};

export default api;
