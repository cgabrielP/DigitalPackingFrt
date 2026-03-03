import { useState, useRef, useEffect } from 'react'
import OrderCard from '../components/OrderCard'
import Header from '../components/Header'
import './ScanOrder.css'

const API_URL = import.meta.env.VITE_API_URL

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})

export default function ScanOrder() {
  const [code,    setCode]    = useState('')
  const [order,   setOrder]   = useState(null)
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [packed,  setPacked]  = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [theme,   setTheme]   = useState(() =>
    localStorage.getItem('picking_theme') || 'dark'
  )
  const inputRef = useRef(null)

  // Sincronizar tema con el atributo global
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  // Auto-focus al limpiar pantalla
  useEffect(() => {
    inputRef.current?.focus()
  }, [order, packed])

  /* ── Handlers ── */
  const handleScan = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setOrder(null)
    setPacked(false)
    try {
      const res  = await fetch(`${API_URL}/orders/scan`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al escanear')
      setOrder(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setCode('')
    }
  }

  const handlePack = async () => {
    console.log(order.displayIdentifier);
    
    if (!order) return
    try {
      const res = await fetch(`${API_URL}/orders/pack/${order.displayIdentifier}`, {
        method: 'POST',
        headers: getHeaders(),
      })
      if (!res.ok) throw new Error('Error al marcar como empacado')
      setPacked(true)
      setTimeout(() => { setOrder(null); setPacked(false) }, 2200)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res  = await fetch(`${API_URL}/orders/sync`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncMsg('✓ OK')
    } catch {
      setSyncMsg('✗ Error')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  /* ── Render ── */
  return (
    <div className="scan-root">
      <div className="scan-bg-grid" />

      {/* Header compartido — navPath='/orders' para mostrar botón ÓRDENES */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onSync={handleSync}
        syncing={syncing}
        syncMsg={syncMsg}
        navPath="/orders"
      />

      <main className="scan-main">

        {/* Input de escaneo */}
        <section className="scan-form-section">
          <p className="scan-section-label">ESCANEAR ORDEN</p>
          <form className="scan-form" onSubmit={handleScan}>
            <div className="scan-input-wrapper">
              <svg className="scan-input-icon" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3"  y="7"  width="3" height="10" rx="1"/>
                <rect x="8"  y="5"  width="2" height="14" rx="1"/>
                <rect x="12" y="7"  width="4" height="10" rx="1"/>
                <rect x="18" y="5"  width="3" height="14" rx="1"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="scan-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ID de orden..."
                autoComplete="off"
              />
            </div>
            <button type="submit" className="scan-submit-btn" disabled={loading}>
              {loading ? (
                <span className="spinner-sm" />
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                  BUSCAR
                </>
              )}
            </button>
          </form>
        </section>

        {/* Error */}
        {error && (
          <div className="scan-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8"  x2="12"    y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Resultado */}
        {order && (
          <OrderCard order={order} packed={packed} onPack={handlePack} />
        )}

        {/* Estado vacío */}
        {!order && !error && !loading && (
          <div className="scan-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="0.8">
              <rect x="3"  y="7"  width="3" height="10" rx="1"/>
              <rect x="8"  y="5"  width="2" height="14" rx="1"/>
              <rect x="12" y="7"  width="4" height="10" rx="1"/>
              <rect x="18" y="5"  width="3" height="14" rx="1"/>
            </svg>
            <p>ESPERANDO ESCANEO</p>
          </div>
        )}

      </main>
    </div>
  )
}