import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTokenValid } from '../utils/auth'
import './Register.css'

const API_URL  = import.meta.env.VITE_API_URL
const saveSession = (token) => localStorage.setItem('app_token', token)

const Alert = ({ msg }) => (
  <div className="reg-alert">
    <span>✕</span>
    <span>{msg}</span>
  </div>
)

const FEATURES = [
  'Gestión de órdenes y picking',
  'Sincronización con MercadoLibre',
  'Control de delivery y pagos',
  'Registro de empaque y trazabilidad',
  'Múltiples usuarios y roles',
]

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 12 4 10" />
  </svg>
)

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep]     = useState(1)
  const [form, setForm]     = useState({ name: '', email: '', password: '', tenantName: '' })
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isTokenValid()) navigate('/settings', { replace: true })
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleStep1 = () => {
    setError(null)
    if (!form.name || !form.email || !form.password)
      return setError('Completá nombre, email y contraseña')
    if (form.password.length < 8)
      return setError('La contraseña debe tener al menos 8 caracteres')
    setStep(2)
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleStep1() }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveSession(data.token)
      navigate('/settings', { replace: true })
    } catch (err) {
      setError(err.message)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reg-root">
      <div className="reg-bg-grid" />
      <div className="reg-bg-glow" />

      <div className="reg-card">

        {/* Brand */}
        <div className="reg-brand" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}>
          <div className="reg-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.6">
              <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
              <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04"/>
            </svg>
          </div>
          <div>
            <p className="reg-brand-name">DIGITALPACKING</p>
            <p className="reg-brand-sub">SISTEMA DE EMPAQUE</p>
          </div>
        </div>

        {/* Progress */}
        <div className="reg-progress">
          <div className={`reg-step ${step >= 1 ? 'reg-step--active' : ''}`}>
            <span>1</span><p>Tu cuenta</p>
          </div>
          <div className="reg-progress-line" />
          <div className={`reg-step ${step >= 2 ? 'reg-step--active' : ''}`}>
            <span>2</span><p>Prueba gratis</p>
          </div>
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="reg-form" key="step1">
            <h2 className="reg-heading">Crea tu cuenta</h2>
            <p className="reg-sub">Configura tus datos para empezar.</p>

            {error && <Alert msg={error} />}

            <div className="reg-field">
              <label className="reg-label">NOMBRE</label>
              <input className="reg-input" placeholder="Tu nombre"
                value={form.name} onChange={set('name')} onKeyDown={handleKey} />
            </div>
            <div className="reg-field">
              <label className="reg-label">EMPRESA <span className="reg-optional">(OPCIONAL)</span></label>
              <input className="reg-input" placeholder="Nombre de tu empresa"
                value={form.tenantName} onChange={set('tenantName')} onKeyDown={handleKey} />
            </div>
            <div className="reg-field">
              <label className="reg-label">EMAIL</label>
              <input className="reg-input" type="email" placeholder="tu@email.com"
                value={form.email} onChange={set('email')} onKeyDown={handleKey} />
            </div>
            <div className="reg-field reg-field--last">
              <label className="reg-label">CONTRASEÑA</label>
              <input className="reg-input" type="password" placeholder="Mínimo 8 caracteres"
                value={form.password} onChange={set('password')} onKeyDown={handleKey} />
            </div>

            <button className="reg-btn-primary" onClick={handleStep1}>
              Continuar →
            </button>

            <div className="reg-switch">
              <span>¿Ya tienes cuenta?</span>
              <button className="reg-switch-link" onClick={() => navigate('/login')}>
                Ingresar
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="reg-form" key="step2">
            <div className="reg-trial-badge">7 DÍAS GRATIS</div>
            <h2 className="reg-heading">Empieza sin costo</h2>
            <p className="reg-sub">
              Tendrás acceso completo durante <strong>7 días</strong>. Sin tarjeta de crédito.
            </p>

            {error && <Alert msg={error} />}

            <div className="reg-features">
              {FEATURES.map(f => (
                <div className="reg-feature" key={f}>
                  <span className="reg-feature-icon"><CheckIcon /></span>
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="reg-trial-info">
              <span className="reg-trial-info-label">PRUEBA GRATIS</span>
              <span className="reg-trial-info-arrow">→</span>
              <span className="reg-trial-info-label">ELIGE TU PLAN</span>
            </div>

            <button className="reg-btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading && <span className="reg-spin" />}
              {loading ? 'CREANDO CUENTA...' : 'Comenzar prueba gratis'}
            </button>

            <button className="reg-btn-back" onClick={() => setStep(1)}>
              ← Volver
            </button>
          </div>
        )}

      </div>
    </div>
  )
}