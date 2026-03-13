import { useEffect, useState, useMemo } from 'react'
import Layout from '../components/Layout'
import DeliveryAssignmentRow from '../components/DeliveryAssignmentRow'
import './MyDeliveries.css'

const API_URL = import.meta.env.VITE_API_URL
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})
const getSession = () => {
  try { return JSON.parse(atob(localStorage.getItem('app_token').split('.')[1])) }
  catch { return null }
}
const todayISO = () => new Date().toISOString().split('T')[0]
const formatDateLabel = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

export default function MyDeliveries() {
  const [assignments, setAssignments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [date,        setDate]        = useState(todayISO())
  const [theme,       setTheme]       = useState(() => localStorage.getItem('picking_theme') || 'light')

  const session = getSession()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  useEffect(() => { loadData() }, [date])

  const loadData = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/delivery/assignments?date=${date}`, { headers: getHeaders() })
      const data = await res.json()
      setAssignments(Array.isArray(data) ? data : [])
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }

  /* ── Derivados de assignments ── */
  const delivered = useMemo(
    () => assignments.filter(a => a.order.shippingStatus === 'delivered'),
    [assignments]
  )
  const inTransit = useMemo(
    () => assignments.filter(a => a.order.shippingStatus === 'shipped'),
    [assignments]
  )

  /*
   * Total a cobrar: solo órdenes donde
   *   - status NO es 'cancelled'  (orden no anulada)
   *   - shippingStatus ES 'delivered'  (efectivamente entregada)
   */
  const totalACobrar = useMemo(
    () =>
      assignments
        .filter(a => a.order.status !== 'cancelled' && a.order.shippingStatus === 'delivered')
        .reduce((sum, a) => sum + (a.paymentAmount || 0), 0),
    [assignments]
  )

  /* ── Navegar entre días ── */
  const changeDate = (offset) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setDate(d.toISOString().split('T')[0])
  }

  return (
    <div className="mdl-root">
      <div className="mdl-bg-grid" />
      <Layout
        subtitle="DELIVERY"
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      >
        <div className="mdl-page">

          {/* ── Header ── */}
          <header className="mdl-header">
            <div>
              <p className="mdl-eyebrow">MIS ENTREGAS</p>
              <h1 className="mdl-title">{session?.name?.toUpperCase() ?? 'DELIVERY'}</h1>
              <p className="mdl-sub">Pedidos asignados</p>
            </div>

            {/* Navegación de fecha */}
            <div className="mdl-date-nav">
              <button className="mdl-date-btn" onClick={() => changeDate(-1)}>←</button>
              <input
                type="date"
                className="mdl-date-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <button
                className="mdl-date-btn"
                onClick={() => changeDate(1)}
                disabled={date >= todayISO()}
                style={date >= todayISO() ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
              >→</button>
            </div>
          </header>

          <p className="mdl-date-label">{formatDateLabel(date)}</p>

          {/* ── Stats ── */}
          <div className="mdl-stats">
            <div className="mdl-stat">
              <span className="mdl-stat-value">{assignments.length}</span>
              <span className="mdl-stat-label">ASIGNADOS</span>
            </div>
            <div className="mdl-stat">
              <span className="mdl-stat-value mdl-stat-value--blue">{inTransit.length}</span>
              <span className="mdl-stat-label">EN CAMINO</span>
            </div>
            <div className="mdl-stat">
              <span className="mdl-stat-value mdl-stat-value--green">{delivered.length}</span>
              <span className="mdl-stat-label">ENTREGADOS</span>
            </div>
            {/* Total calculado localmente: no canceladas + entregadas */}
            <div className="mdl-stat mdl-stat--highlight">
              <span className="mdl-stat-value mdl-stat-value--green">
                ${totalACobrar.toLocaleString('es-CL')}
              </span>
              <span className="mdl-stat-label">A COBRAR HOY</span>
            </div>
          </div>

          {/* ── Tabla ── */}
          {loading ? (
            <div className="mdl-empty"><span className="mdl-spin mdl-spin--lg" /></div>
          ) : assignments.length === 0 ? (
            <div className="mdl-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 3v5h-7V8zM1 16l3-4M19 19a2 2 0 100-4 2 2 0 000 4zM6 19a2 2 0 100-4 2 2 0 000 4z"/>
              </svg>
              <p>SIN PEDIDOS ASIGNADOS PARA ESTE DÍA</p>
            </div>
          ) : (
            <div className="mdl-table-wrapper">
              <table className="mdl-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>COMPRADOR</th>
                    <th>PRODUCTOS</th>
                    <th>ESTADO ENVÍO</th>
                    <th>CIUDAD</th>
                    <th>ASIGNADO</th>
                    <th>PAGO</th>
                    <th>NOTAS</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, i) => (
                    <DeliveryAssignmentRow
                      key={a.id}
                      assignment={a}
                      index={i}
                      canManage={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </Layout>
    </div>
  )
}