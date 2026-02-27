import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isTokenValid } from '../utils/auth'
import './Login.css'

const API_URL = import.meta.env.VITE_API_URL

export default function Login() {
  const navigate = useNavigate()
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (isTokenValid()) {
      navigate('/orders', { replace: true })
      return
    }
    const token = localStorage.getItem('app_token')
    if (token) setExpired(true)
  }, [])

  const handleConnect = () => {
    window.location.href = `${API_URL}/auth/mercadolibre`
  }

  return (
    <div className="login-root">
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />

      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo-wrapper">
            {/* Ícono de caja/picking */}
            <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
              <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
              <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04"/>
            </svg>
          </div>
          <div>
            <h1 className="login-title">DIGITAL PICKING</h1>
            <p className="login-subtitle">SISTEMA DE EMPAQUE</p>
          </div>
        </div>

        <div className="login-divider" />

        {/* Beneficios */}
        <div className="login-info">
          <div className="login-info-item">
            <span className="login-info-dot" />
            Sincroniza tus órdenes de Mercado Libre
          </div>
          <div className="login-info-item">
            <span className="login-info-dot" />
            Escanea y verifica productos antes de empacar
          </div>
          <div className="login-info-item">
            <span className="login-info-dot" />
            Reduce errores en el despacho
          </div>
        </div>

        {/* Error sesión expirada */}
        {expired && (
          <div className="login-error">
            <span>⚠</span>
            Tu sesión expiró. Vuelve a conectar tu cuenta.
          </div>
        )}

        {/* Botón */}
        <button className="login-btn" onClick={handleConnect}>
          
          INICIAR CON MERCADO LIBRE
        </button>

        <p className="login-footer">
          Al continuar autorizas a Digital Picking a acceder<br />
          a tus órdenes de Mercado Libre de forma segura.
        </p>

      </div>
    </div>
  )
}