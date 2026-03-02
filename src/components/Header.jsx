import { useNavigate } from 'react-router-dom'
import { Sun, Moon, ScanBarcode, LayoutGrid, RefreshCw, LogOut, Loader2 } from 'lucide-react'
import { logout } from '../utils/auth'
import './Header.css'

/**
 * Props:
 *  theme         — 'dark' | 'light'
 *  onToggleTheme — fn
 *  onSync        — fn
 *  syncing       — bool
 *  syncMsg       — string | null   (mensaje opcional post-sync, ej: '✓ Sincronizado')
 *  navPath       — '/scan' | '/orders'  (a dónde va el botón de navegación)
 */
export default function Header({
  theme,
  onToggleTheme,
  onSync,
  syncing,
  syncMsg   = null,
  navPath   = '/scan',
}) {
  const navigate = useNavigate()

  const iconColor  = theme === 'dark' ? '#a1a1a1' : '#555555'
  const iconSize   = 16

  // El botón de nav muestra el destino opuesto a la página actual
  const isOnScan   = navPath === '/orders'   // si navPath es /orders, estoy en scan
  const NavIcon    = isOnScan ? LayoutGrid : ScanBarcode
  const navLabel   = isOnScan ? 'ÓRDENES'  : 'ESCANEAR'

  // Texto del botón sync
  const syncLabel  = syncMsg
    ? syncMsg
    : syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'

  return (
    <header className="app-header">

      {/* ── Logo ── */}
      <div className="app-header-left">
        <span className="app-logo">PICKING</span>
        <span className="app-logo-dot">●</span>
        <span className="app-logo-sub">SYSTEM</span>
      </div>

      {/* ── Acciones ── */}
      <div className="app-header-actions">

        {/* Toggle tema */}
        <button
          className="app-header-icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-label="Cambiar tema"
        >
          {theme === 'dark'
            ? <Sun  size={iconSize} color="#f59e0b" strokeWidth={2} />
            : <Moon size={iconSize} color="#6366f1" strokeWidth={2} />
          }
        </button>

        {/* Navegación */}
        <button
          className="app-header-btn"
          onClick={() => navigate(navPath)}
          aria-label={navLabel}
        >
          <NavIcon size={iconSize} color={iconColor} strokeWidth={2} />
          <span className="app-header-btn-label">{navLabel}</span>
        </button>

        {/* Sincronizar */}
        <button
          className="app-header-sync-btn"
          onClick={onSync}
          disabled={syncing}
          aria-label="Sincronizar órdenes"
        >
          {syncing
            ? <Loader2   size={13} color="#000" strokeWidth={2.5} className="spin" />
            : <RefreshCw size={13} color="#000" strokeWidth={2.5} />
          }
          <span className="app-header-btn-label">{syncLabel}</span>
        </button>

        {/* Logout */}
        <button
          className="app-header-icon-btn app-header-logout"
          onClick={logout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut size={iconSize} color={iconColor} strokeWidth={2} />
        </button>

      </div>
    </header>
  )
}