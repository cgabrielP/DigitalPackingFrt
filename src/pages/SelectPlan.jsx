import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../utils/auth'
import './SelectPlan.css'

// ── Precios — editá aquí ──────────────────────────────
const PRICE_MONTHLY       = 29990   // CLP / mes (plan mensual)
const PRICE_ANNUAL_MONTH  = 19990   // CLP / mes (plan anual, cobrado anual)
const PRICE_ANNUAL_TOTAL  = 239880  // CLP / año
// ─────────────────────────────────────────────────────

const getSession = () => {
  try {
    return JSON.parse(atob(localStorage.getItem('app_token').split('.')[1]))
  } catch { return null }
}

const fmt = (n) => n.toLocaleString('es-CL')

const FEATURES = [
  'Gestión de órdenes y picking',
  'Sincronización con MercadoLibre',
  'Control de delivery y pagos',
  'Registro de empaque y trazabilidad',
  'Múltiples usuarios y roles',
]

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 12 4 10" />
  </svg>
)

export default function SelectPlan() {
  const navigate  = useNavigate()
  const session   = getSession()
  const [annual, setAnnual] = useState(true)

  useEffect(() => {
    const theme = localStorage.getItem('picking_theme') || 'light'
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  const waMsg = annual
    ? `Hola, quiero activar el plan anual de DigitalPacking ($${fmt(PRICE_ANNUAL_TOTAL)}/año)`
    : `Hola, quiero activar el plan mensual de DigitalPacking ($${fmt(PRICE_MONTHLY)}/mes)`

  const waUrl = `https://wa.me/${import.meta.envWHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`

  const saving = Math.round((1 - PRICE_ANNUAL_MONTH / PRICE_MONTHLY) * 100)

  return (
    <div className="sp-root">
      <div className="sp-card">

        {/* Brand */}
        <div className="sp-brand">
          <div className="sp-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.6">
              <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
              <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04"/>
            </svg>
          </div>
          <div>
            <p className="sp-brand-name">DIGITALPACKING</p>
            <p className="sp-brand-sub">SISTEMA DE EMPAQUE</p>
          </div>
        </div>

        <h1 className="sp-title">
          {session?.name ? `Hola, ${session.name}.` : 'Elige tu plan'}
        </h1>
        <p className="sp-sub">
          Tu período de prueba finalizó. Activa tu plan para seguir operando sin interrupciones.
        </p>

        {/* Toggle mensual / anual */}
        <div className="sp-toggle">
          <button
            className={`sp-toggle-btn ${!annual ? 'sp-toggle-btn--active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            MENSUAL
          </button>
          <button
            className={`sp-toggle-btn ${annual ? 'sp-toggle-btn--active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            ANUAL
            <span className="sp-save-badge">-{saving}%</span>
          </button>
        </div>

        {/* Precio */}
        <div className="sp-price-block">
          <div className="sp-price">
            <span className="sp-price-currency">$</span>
            <span className="sp-price-amount">
              {fmt(annual ? PRICE_ANNUAL_MONTH : PRICE_MONTHLY)}
            </span>
            <span className="sp-price-period">/mes</span>
          </div>
          {annual && (
            <p className="sp-price-note">
              Cobrado anualmente — ${fmt(PRICE_ANNUAL_TOTAL)} CLP/año
            </p>
          )}
        </div>

        {/* Features */}
        <div className="sp-features">
          {FEATURES.map(f => (
            <div className="sp-feature" key={f}>
              <span className="sp-feature-icon"><CheckIcon /></span>
              <span>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a className="sp-btn-primary" href={waUrl} target="_blank" rel="noreferrer">
          Activar plan {annual ? 'anual' : 'mensual'} →
        </a>

        <p className="sp-hint">Te contactaremos por WhatsApp para completar la activación.</p>

        <button className="sp-btn-logout" onClick={logout}>
          Cerrar sesión
        </button>

      </div>
    </div>
  )
}