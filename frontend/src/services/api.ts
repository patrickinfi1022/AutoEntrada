// src/services/api.ts
import axios from 'axios';

// Instancia global de Axios apuntando al puerto de FastAPI
const api = axios.create({
  baseURL: 'http://localhost:8000',
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
};

// --- SERVICIOS PARA EL MÓDULO DE MONITOREO E IA ---

export const monitoreoService = {
  obtenerHistorial: async () => {
    const respuesta = await api.get('/api/monitoreo/historial');
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