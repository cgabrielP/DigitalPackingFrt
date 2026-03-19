import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTokenValid } from '../utils/auth'
import './Login.css'

const API_URL = import.meta.env.VITE_API_URL
const saveSession = (token) => localStorage.setItem('app_token', token)

const Alert = ({ type, msg }) => (
  <div className={`login-alert login-alert--${type}`}>
    <span>{type === 'error' ? '✕' : '✓'}</span>
    <span>{msg}</span>
  </div>
)

const LoginForm = ({ onSuccess }) => {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveSession(data.token)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <>
      {error && <Alert type="error" msg={error} />}
      <div className="login-field">
        <label className="login-label">EMAIL</label>
        <input className="login-input" type="email" placeholder="tu@email.com"
          value={form.email} onChange={set('email')} onKeyDown={handleKey} />
      </div>
      <div className="login-field login-field--last">
        <label className="login-label">CONTRASEÑA</label>
        <input className="login-input" type="password" placeholder="••••••••"
          value={form.password} onChange={set('password')} onKeyDown={handleKey} />
      </div>
      <button className="login-btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading && <span className="login-spin" />}
        {loading ? 'INGRESANDO...' : 'INGRESAR'}
      </button>
    </>
  )
}

export default function Login() {
  const navigate = useNavigate()

  useEffect(() => {
    if (isTokenValid()) navigate('/settings', { replace: true })
  }, [])

  const handleSuccess = () => navigate('/settings', { replace: true })

  return (
    <div className="login-root">
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.6">
              <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
              <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04"/>
            </svg>
          </div>
          <div>
            <p className="login-brand-name">DIGITALPACKING</p>
            <p className="login-brand-sub">SISTEMA DE EMPAQUE</p>
          </div>
        </div>

        <p className="login-heading">Ingresar</p>

        <LoginForm onSuccess={handleSuccess} />

        <div className="login-switch">
          <span>¿No tienes cuenta?</span>
          <button className="login-switch-link" onClick={() => navigate('/register')}>
            Crear cuenta gratis
          </button>
        </div>
      </div>
    </div>
  )
}