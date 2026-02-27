import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthSuccess() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Conectando tu cuenta...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      localStorage.setItem('app_token', token)
      setStatus('¡Cuenta conectada! Redirigiendo...')
      setTimeout(() => navigate('/orders', { replace: true }), 2500)
    } else {
      const existingToken = localStorage.getItem('app_token')
      if (existingToken) {
        navigate('/orders', { replace: true })
      } else {
        setStatus('Algo salió mal. Redirigiendo...')
        setTimeout(() => navigate('/login', { replace: true }), 2500)
      }
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '16px',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '5px solid #e0e0e0',
        borderTop: '5px solid #3483fa',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#555', fontSize: '16px' }}>{status}</p>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}