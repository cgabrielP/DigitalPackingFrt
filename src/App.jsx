import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isTokenValid } from './utils/auth'

// Páginas
import Login from './pages/Login'
import Settings from './pages/Settings'
import Orders from './pages/Orders'
import ScanOrder from './pages/ScanOrder'
import AuthSuccess from './pages/AuthSuccess'

import './App.css'
import AdminPanel from './pages/AdminPanel'
import OrderHistory from './pages/OrderHistory'
import AssignDelivery from './pages/AssignDelivery'
import MyDeliveries from './pages/MyDeliveries'
import PackingLog from './pages/PackingLog'
import Upgrade from './pages/Upgrade'

/* ─────────────────────────────────────────
   GUARDS
───────────────────────────────────────── */

/** Ruta privada — cualquier usuario autenticado */
function PrivateRoute({ children }) {
  if (!isTokenValid()) {
    localStorage.removeItem('app_token')
    return <Navigate to="/login" replace />
  }
  return children
}

/** Ruta privada solo para ciertos roles
 *  @param {string[]} roles  ej: ['ADMIN']
 */
function RoleRoute({ children, roles }) {
  if (!isTokenValid()) {
    localStorage.removeItem('app_token')
    return <Navigate to="/login" replace />
  }

  try {
    const token = localStorage.getItem('app_token')
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!roles.includes(payload.role)) {
      // Autenticado pero sin permiso → redirigir a órdenes
      return <Navigate to="/orders" replace />
    }
  } catch {
    return <Navigate to="/login" replace />
  }

  return children
}


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Públicas ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/upgrade" element={<Upgrade />} />

        {/* ── Privadas — cualquier rol autenticado ── */}
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route path="/order-history" element={
          <PrivateRoute><OrderHistory /></PrivateRoute>
        } />
        <Route
          path="/scan"
          element={
            <PrivateRoute>
              <ScanOrder />
            </PrivateRoute>
          }
        />

        {/* ── Privadas — solo ADMIN ── */}
        <Route
          path="/settings"
          element={
            <RoleRoute roles={['ADMIN']}>
              <Settings />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute roles={['ADMIN']}>
              <AdminPanel />
            </RoleRoute>
          }
        />
        <Route
          path="/assign-delivery"
          element={
            <RoleRoute roles={['ADMIN', 'SUPERVISOR']}>
              <AssignDelivery />
            </RoleRoute>
          }
        />
        <Route
          path="/packing-log"
          element={
            <RoleRoute roles={['ADMIN', 'SUPERVISOR']}>
              <PackingLog />
            </RoleRoute>
          }
        />
        <Route
          path="/my-deliveries"
          element={
            <RoleRoute roles={['DELIVERY']}>
              <MyDeliveries />
            </RoleRoute>
          }
        />
        {/* ── Raíz y comodín ── */}
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App