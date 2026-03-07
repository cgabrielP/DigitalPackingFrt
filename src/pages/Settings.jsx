import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../utils/auth'
import './Settings.css'

const API_URL = import.meta.env.VITE_API_URL

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})

/* ── Decodifica el JWT sin librería ── */
const getSession = () => {
  try {
    const t = localStorage.getItem('app_token')
    return JSON.parse(atob(t.split('.')[1]))
  } catch { return null }
}

/* ── Alert ── */
const Alert = ({ type, msg }) => (
  <div className={`st-alert st-alert--${type}`}>
    <span>{type === 'error' ? '✕' : '✓'}</span>
    <span>{msg}</span>
  </div>
)

/* ── Icons ── */
const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
)

const IconOrders = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
  </svg>
)

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

export default function Settings() {
  const [accounts,   setAccounts]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [notice,     setNotice]     = useState(null)
  const navigate = useNavigate()

  const session = getSession()

  const loadAccounts = async () => {
    try {
      const res  = await fetch(`${API_URL}/auth/ml/accounts`, { headers: getHeaders() })
      if (res.status === 401) { logout(); return }
      const data = await res.json()
      if (res.ok) setAccounts(data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadAccounts()

    // Detectar redirect de ML con ?connected=true/false
    const params = new URLSearchParams(window.location.search)
    const conn   = params.get('connected')

    if (conn === 'true') {
      setNotice({ type: 'success', msg: 'Cuenta de Mercado Libre conectada correctamente' })
      loadAccounts()
    }
    if (conn === 'false') {
      setNotice({ type: 'error', msg: 'No se pudo conectar la cuenta de Mercado Libre' })
    }
    if (conn) window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const handleConnect = () => {
    setConnecting(true)
    const token = localStorage.getItem('app_token')
    window.location.href = `${API_URL}/auth/mercadolibre?token=${token}`
  }

  const formatSync = (date) => {
    if (!date) return 'Sin sync aún'
    return `Sync ${new Date(date).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })}`
  }

  return (
    <div className="st-root">
      <div className="st-bg-grid" />
      <div className="st-bg-glow" />

      <div className="st-page">

        {/* ── Nav ── */}
        <nav className="st-nav">
          <div className="st-nav-brand">
            <span className="st-nav-logo">PICKING</span>
            <span className="st-nav-dot">●</span>
            <span className="st-nav-sub">SYSTEM</span>
          </div>
          <div className="st-nav-actions">
            <button className="st-nav-btn" onClick={() => navigate('/orders')}>
              <IconOrders /> ÓRDENES
            </button>
            <button className="st-nav-btn st-nav-btn--logout" onClick={logout}>
              <IconLogout /> SALIR
            </button>
          </div>
        </nav>

        {/* ── Header ── */}
        <header className="st-header">
          <p className="st-header-eyebrow">
            BIENVENIDO{session?.name ? `, ${session.name.toUpperCase()}` : ''}
          </p>
          <h1 className="st-header-title">CUENTAS MERCADO LIBRE</h1>
          <p className="st-header-sub">
            Conectá una o más cuentas de Mercado Libre a tu empresa
          </p>
        </header>

        {/* ── Notice ── */}
        {notice && <Alert type={notice.type} msg={notice.msg} />}

        {/* ── Account list ── */}
        <section className="st-section">
          <p className="st-section-label">
            CUENTAS CONECTADAS
            <span className="st-section-count">{accounts.length}</span>
          </p>

          {loading ? (
            <div className="st-empty">
              <span className="st-spin st-spin--lg" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="st-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              <p>SIN CUENTAS CONECTADAS</p>
            </div>
          ) : (
            <div className="st-accounts">
              {accounts.map((acc, i) => (
                <div
                  key={acc.id}
                  className="st-account-card"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="st-account-avatar">
                    {(acc.nickname ?? 'ML')[0].toUpperCase()}
                  </div>
                  <div className="st-account-info">
                    <p className="st-account-nick">
                      {acc.nickname ?? `Cuenta ${acc.mlUserId}`}
                    </p>
                    <p className="st-account-meta">
                      ID {acc.mlUserId} · {formatSync(acc.lastSyncedAt)}
                    </p>
                  </div>
                  <span className="st-account-badge">
                    <span className="st-badge-dot" />
                    ACTIVA
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Conectar nueva cuenta */}
          <button className="st-add-btn" onClick={handleConnect} disabled={connecting}>
            {connecting ? <span className="st-spin" /> : <IconPlus />}
            {connecting ? 'REDIRIGIENDO A MERCADO LIBRE...' : 'CONECTAR CUENTA DE MERCADO LIBRE'}
          </button>
        </section>

        {/* ── CTA ir a la app ── */}
        {accounts.length > 0 && (
          <div className="st-cta">
            <div className="st-cta-text">
              <p className="st-cta-title">✓ TODO LISTO</p>
              <p className="st-cta-sub">
                {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} conectada{accounts.length !== 1 ? 's' : ''}.
                Ya podés sincronizar y gestionar tus órdenes.
              </p>
            </div>
            <button className="st-cta-btn" onClick={() => navigate('/orders')}>
              IR A ÓRDENES <IconArrow />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}