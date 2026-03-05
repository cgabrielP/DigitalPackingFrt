import { useState, useRef, useEffect, useCallback } from 'react'
import OrderCard from '../components/OrderCard'
import Header from '../components/Header'
import './ScanOrder.css'

const API_URL = import.meta.env.VITE_API_URL

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})

export default function ScanOrder() {
  const [code,        setCode]        = useState('')
  const [order,       setOrder]       = useState(null)
  const [error,       setError]       = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [packed,      setPacked]      = useState(false)
  const [syncMsg,     setSyncMsg]     = useState(null)
  const [scannerMode, setScannerMode] = useState(false) // pulso visual al recibir input del scanner
  const [theme,       setTheme]       = useState(() =>
    localStorage.getItem('picking_theme') || 'dark'
  )

  const inputRef      = useRef(null)
  const scannerBuffer = useRef('')   // buffer para input del scanner (viene muy rápido)
  const scannerTimer  = useRef(null) // timeout para detectar fin de secuencia

  /* ── Tema ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  /* ── Auto-focus al limpiar pantalla ── */
  useEffect(() => {
    inputRef.current?.focus()
  }, [order, packed])

  /* ── Handlers de submit / pack / sync ── */
  const submitCode = useCallback(async (value) => {
    const trimmed = value.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setOrder(null)
    setPacked(false)

    try {
      const res  = await fetch(`${API_URL}/orders/scan`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ code: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al escanear')
      setOrder(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setCode('')
      if (inputRef.current) inputRef.current.value = ''
      // Refocus siempre, incluso si hay resultado
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [])

  const handleScan = (e) => {
    e.preventDefault()
    // Leer directo del DOM — el scanner es tan rápido que el estado React
    // puede estar desactualizado cuando llega el Enter
    const value = inputRef.current?.value || code
    submitCode(value)
  }

  const handlePack = async () => {
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
      const n = data.total ?? 0
      setSyncMsg(n === 0 ? '✓ Al día' : `✓ ${n} nuevas`)
    } catch {
      setSyncMsg('✗ Error')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 3000)
    }
  }

  /* ── Captura global de teclado para pistola lectora ──────────────────────
     Las pistolas de barras envían caracteres muy rápido (< 50 ms entre cada
     uno) y terminan con Enter.  Si el input no tiene foco (p.ej. el usuario
     miraba la tarjeta), redirigimos el buffer al input y hacemos submit.
  ──────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const SCANNER_CHAR_INTERVAL_MS = 50 // ms máximo entre chars del scanner

    const onKeyDown = (e) => {
      const active = document.activeElement
      const isInput = active === inputRef.current

      // Si el foco ya está en nuestro input → comportamiento normal del form
      if (isInput) return

      // Ignorar si el foco está en otro input/button/textarea
      const tag = active?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select', 'button'].includes(tag)) return

      // Ignorar teclas de control (Ctrl+, Alt+, Meta+)
      if (e.ctrlKey || e.altKey || e.metaKey) return

      // Caracter imprimible o Enter
      if (e.key === 'Enter') {
        if (scannerBuffer.current.trim()) {
          const captured = scannerBuffer.current
          scannerBuffer.current = ''
          clearTimeout(scannerTimer.current)
          setScannerMode(false)
          setCode(captured)
          submitCode(captured)
        }
        return
      }

      if (e.key.length === 1) {
        // Acumular en buffer
        scannerBuffer.current += e.key
        setScannerMode(true)

        // Mostrar en el input
        setCode(scannerBuffer.current)

        // Resetear timer — si pasan más de SCANNER_CHAR_INTERVAL_MS sin más
        // chars, asumimos fin de secuencia (no llegó Enter)
        clearTimeout(scannerTimer.current)
        scannerTimer.current = setTimeout(() => {
          // Si llegaron al menos 4 chars, los tratamos como código completo
          if (scannerBuffer.current.trim().length >= 4) {
            const captured = scannerBuffer.current
            scannerBuffer.current = ''
            setScannerMode(false)
            setCode(captured)
            submitCode(captured)
          } else {
            // Poco chars → probablemente tecleo manual, pasar foco al input
            inputRef.current?.focus()
            scannerBuffer.current = ''
            setScannerMode(false)
          }
        }, SCANNER_CHAR_INTERVAL_MS * 3)

        e.preventDefault()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(scannerTimer.current)
    }
  }, [submitCode])

  /* ── Render ── */
  return (
    <div className="scan-root">
      <div className="scan-bg-grid" />

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
          <div className="scan-section-header">
            <p className="scan-section-label">ESCANEAR ORDEN</p>
            {/* Indicador de modo scanner */}
            <span className={`scan-ready-indicator ${scannerMode ? 'scan-ready-indicator--active' : ''}`}>
              <span className="scan-ready-dot" />
              {scannerMode ? 'LEYENDO...' : 'LISTO'}
            </span>
          </div>

          <form className="scan-form" onSubmit={handleScan}>
            <div className="scan-input-wrapper">
              {/* Icono barras */}
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
                className={`scan-input${scannerMode ? ' scan-input--scanning' : ''}`}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ID de orden o escanea el código..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {code && (
                <button
                  type="button"
                  className="scan-input-clear"
                  onClick={() => { setCode(''); inputRef.current?.focus() }}
                  tabIndex={-1}
                  aria-label="Limpiar"
                >
                  ×
                </button>
              )}
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

          {/* Hint */}
          <p className="scan-hint">
            Escribe el ID manualmente o apunta la pistola lectora — captura automática activa
          </p>
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