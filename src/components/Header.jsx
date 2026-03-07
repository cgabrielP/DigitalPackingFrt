import { useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { Sun, Moon, ScanBarcode, LayoutGrid, RefreshCw, Loader2, Menu } from 'lucide-react'
import { logout } from '../utils/auth'
import './Header.css'

/* ── Leer sesión del JWT ── */
const getSession = () => {
  try {
    const t = localStorage.getItem('app_token')
    return JSON.parse(atob(t.split('.')[1]))
  } catch { return null }
}

const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const ROLE_LABEL = {
  ADMIN:      'Admin',
  SUPERVISOR: 'Supervisor',
  PICKER:     'Picker',
  DELIVERY:   'Delivery',
}

/* ════════════════════════════════════════
   AVATAR DROPDOWN
════════════════════════════════════════ */
const AvatarDropdown = ({ session }) => {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  const navigate        = useNavigate()
  const isAdmin         = session?.role === 'ADMIN'

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const go = (path) => { setOpen(false); navigate(path) }

  const initials  = getInitials(session?.name)
  const roleLabel = ROLE_LABEL[session?.role] ?? session?.role ?? '—'

  return (
    <div className="av-wrapper" ref={ref}>

      <button
        className={`av-trigger ${open ? 'av-trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        <span className="av-avatar">{initials}</span>
        <span className="av-chevron" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="av-dropdown" role="menu">

          <div className="av-user-header">
            <div className="av-user-avatar-lg">{initials}</div>
            <div className="av-user-info">
              <p className="av-user-name">{session?.name ?? 'Usuario'}</p>
              <span className={`av-role-badge av-role-badge--${session?.role?.toLowerCase()}`}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="av-divider" />

          {isAdmin && (
            <>
              <button className="av-item" onClick={() => go('/settings')} role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
                Cuentas ML
              </button>

              <button className="av-item" onClick={() => go('/admin')} role="menuitem">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                Panel de usuarios
              </button>

              <div className="av-divider" />
            </>
          )}

          <button className="av-item av-item--danger" onClick={logout} role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Cerrar sesión
          </button>

        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   HEADER
   Props nuevas:
   - subtitle     : texto junto al logo
   - onMenuToggle : abre el sidebar en mobile
════════════════════════════════════════ */
export default function Header({
  subtitle       = 'SYSTEM',
  theme,
  onToggleTheme,
  onSync         = null,
  syncing        = false,
  syncMsg        = null,
  navPath        = null,
  onMenuToggle   = null,   // ← nuevo: hamburger mobile
}) {
  const navigate  = useNavigate()
  const session   = getSession()

  const iconColor = theme === 'dark' ? '#a1a1a1' : '#555555'
  const iconSize  = 16

  const isOnScan  = navPath === '/orders'
  const NavIcon   = isOnScan ? LayoutGrid : ScanBarcode
  const navLabel  = isOnScan ? 'ÓRDENES'  : 'ESCANEAR'
  const syncLabel = syncMsg ? syncMsg : syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'

  return (
    <header className="app-header">

      <div className="app-header-left">
        {/* Hamburger — solo mobile, solo si hay sidebar */}
        {onMenuToggle && (
          <button
            className="app-header-icon-btn app-header-hamburger"
            onClick={onMenuToggle}
            aria-label="Abrir menú"
          >
            <Menu size={18} color={iconColor} strokeWidth={2} />
          </button>
        )}

        {/* Logo — link a orders */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => navigate('/orders')}
        >
          <span className="app-logo">PICKING</span>
          <span className="app-logo-dot">●</span>
          <span className="app-logo-sub">{subtitle}</span>
        </div>
      </div>

      <div className="app-header-actions">

        {/* Toggle tema */}
        <button
          className="app-header-icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark'
            ? <Sun  size={iconSize} color="#f59e0b" strokeWidth={2} />
            : <Moon size={iconSize} color="#6366f1" strokeWidth={2} />
          }
        </button>

        {/* Navegación — solo si se pasa navPath */}
        {navPath && (
          <button className="app-header-btn" onClick={() => navigate(navPath)}>
            <NavIcon size={iconSize} color={iconColor} strokeWidth={2} />
            <span className="app-header-btn-label">{navLabel}</span>
          </button>
        )}

        {/* Sincronizar — solo si se pasa onSync */}
        {onSync && (
          <button
            className="app-header-sync-btn"
            onClick={onSync}
            disabled={syncing}
          >
            {syncing
              ? <Loader2   size={13} color="#000" strokeWidth={2.5} className="spin" />
              : <RefreshCw size={13} color="#000" strokeWidth={2.5} />
            }
            <span className="app-header-btn-label">{syncLabel}</span>
          </button>
        )}

        {/* Avatar dropdown */}
        <AvatarDropdown session={session} />

      </div>
    </header>
  )
}