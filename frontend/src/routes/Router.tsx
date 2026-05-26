// src/routes/Router.tsx
import { createBrowserRouter } from 'react-router-dom';
import Login from '../views/Login';
import DashboardAdmin from '../views/admin/DashboardAdmin';
import DashboardSeguridad from '../views/seguridad/DashboardSeguridad';
import DashboardUsuario from '../views/usuario/DashboardUsuario';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/admin',
    element: <DashboardAdmin />,
  },
  {
    path: '/seguridad',
    element: <DashboardSeguridad />,
  },
  {
    path: '/residente',
    element: <DashboardUsuario />,
  },
  {
    path: '*',
    element: <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}><h2>404 - Página No Encontrada</h2><a href="/">Volver al inicio</a></div>,
  }
]);
