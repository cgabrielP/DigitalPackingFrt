import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import './Sidebar.css'

/* ════════════════════════════════════════
   CONTEXT — expone el estado del sidebar
   a Header (para el hamburger en mobile)
════════════════════════════════════════ */
export const SidebarContext = createContext({
  collapsed:      false,
  mobileOpen:     false,
  toggleCollapse: () => {},
  toggleMobile:   () => {},
})

export const useSidebar = () => useContext(SidebarContext)

/* ── Leer sesión del JWT ── */
const getSession = () => {
  try {
    const t = localStorage.getItem('app_token')
    return JSON.parse(atob(t.split('.')[1]))
  } catch { return null }
}

/* ════════════════════════════════════════
   ICONS
════════════════════════════════════════ */
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)

const IconOrders = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
)

const IconScan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
)

const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 4v4h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
)

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)

const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

/* ════════════════════════════════════════
   NAV ITEM
════════════════════════════════════════ */
const NavItem = ({ icon, label, path, color = 'amber', badge, collapsed, onClick }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = location.pathname === path || location.pathname.startsWith(path + '/')

  const handleClick = () => {
    if (onClick) { onClick(); return }
    navigate(path)
  }

  return (
    <button
      className={[
        'sb-item',
        isActive  ? 'sb-item--active'    : '',
        isActive  ? `sb-item--${color}`  : '',
        badge     ? 'sb-item--has-badge' : '',
      ].join(' ')}
      onClick={handleClick}
      data-tooltip={collapsed ? label : undefined}
      aria-label={label}
    >
      <span className="sb-item-icon">{icon}</span>
      <span className="sb-item-label">{label}</span>
      {badge > 0 && <span className="sb-badge">{badge > 99 ? '99+' : badge}</span>}
      {badge > 0 && <span className="sb-badge-dot" />}
    </button>
  )
}

/* ════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════ */
export default function Sidebar({ pendingDeliveryCount = 0, onAssignDelivery }) {
  const { collapsed, mobileOpen, toggleCollapse, toggleMobile } = useSidebar()
  const session = getSession()
  const role    = session?.role ?? ''

  const isAdmin      = role === 'ADMIN'
  const isSupervisor = role === 'SUPERVISOR'
  const canAssign    = isAdmin || isSupervisor

  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="sb-backdrop" onClick={toggleMobile} />
      )}

      <aside className={[
        'sb',
        collapsed   ? 'sb--collapsed'    : '',
        mobileOpen  ? 'sb--mobile-open'  : '',
      ].join(' ')}>

        <nav className="sb-nav">

          {/* ── Principal ── */}
          <p className="sb-section-label">PRINCIPAL</p>

          <NavItem
            icon={<IconDashboard />}
            label="DASHBOARD"
            path="/dashboard"
            color="amber"
            collapsed={collapsed}
          />

          <NavItem
            icon={<IconOrders />}
            label="ÓRDENES"
            path="/orders"
            color="blue"
            collapsed={collapsed}
          />

          <NavItem
            icon={<IconScan />}
            label="ESCANEAR"
            path="/scan"
            color="green"
            collapsed={collapsed}
          />

          {/* ── Operaciones — Admin y Supervisor ── */}
          {canAssign && (
            <>
              <div className="sb-divider" />
              <p className="sb-section-label">OPERACIONES</p>

              <NavItem
                icon={<IconTruck />}
                label="ASIGNAR DELIVERY"
                path="/assign-delivery"
                color="purple"
                badge={pendingDeliveryCount}
                collapsed={collapsed}
              />
            </>
          )}

          {/* ── Administración — solo Admin ── */}
          {isAdmin && (
            <>
              <div className="sb-divider" />
              <p className="sb-section-label">ADMINISTRACIÓN</p>

              <NavItem
                icon={<IconUsers />}
                label="USUARIOS"
                path="/admin"
                color="amber"
                collapsed={collapsed}
              />

              <NavItem
                icon={<IconSettings />}
                label="CUENTAS ML"
                path="/settings"
                color="amber"
                collapsed={collapsed}
              />
            </>
          )}

        </nav>

        {/* ── Botón collapse (solo desktop) ── */}
        <div className="sb-footer">
          <button
            className="sb-collapse-btn"
            onClick={toggleCollapse}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            <span className="sb-collapse-icon">
              <IconChevronLeft />
            </span>
          </button>
        </div>

      </aside>
    </>
  )
}