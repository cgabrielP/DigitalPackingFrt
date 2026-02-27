import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import OrderTable from '../components/OrderTable'
import { logout } from '../utils/auth'
import './Orders.css'

const API_URL = import.meta.env.VITE_API_URL

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})

const FILTERS = [
  { key: 'all',     label: 'TODAS',     color: '#fff'    },
  { key: 'pending', label: 'PENDIENTE', color: '#f59e0b' },
  { key: 'scanned', label: 'ESCANEADO', color: '#3b82f6' },
  { key: 'packed',  label: 'EMPACADO',  color: '#16a34a' },
]

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')
  const [toast, setToast]     = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_URL}/orders`, { headers: getHeaders() })
      if (res.status === 401) { logout(); return }
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      showToast('Error cargando órdenes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const res = await fetch(`${API_URL}/orders/sync`, {
        method: 'POST',
        headers: getHeaders(),
      })
      if (!res.ok) throw new Error()
      showToast('✓ Órdenes sincronizadas')
      await loadOrders()
    } catch {
      showToast('Error al sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { loadOrders() }, [])

  // Estadísticas
  const stats = useMemo(() => ({
    total:   orders.length,
    pending: orders.filter(o => o.pickingStatus === 'pending').length,
    scanned: orders.filter(o => o.pickingStatus === 'scanned').length,
    packed:  orders.filter(o => o.pickingStatus === 'packed').length,
  }), [orders])

  // Filtrado + búsqueda
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchFilter = filter === 'all' || o.pickingStatus === filter
      const matchSearch = !search ||
        o.id.toString().includes(search) ||
        o.buyerNickname?.toLowerCase().includes(search.toLowerCase())
      return matchFilter && matchSearch
    })
  }, [orders, filter, search])

  return (
    <div className="orders-root">
      <div className="orders-bg-grid" />

      {/* Header */}
      <header className="orders-header">
        <div className="orders-header-left">
          <span className="orders-logo">PICKING</span>
          <span className="orders-logo-dot">●</span>
          <span className="orders-logo-sub">SYSTEM</span>
        </div>
        <div className="orders-header-actions">
          <button className="orders-nav-btn" onClick={() => navigate('/scan')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="7" width="3" height="10" rx="1"/>
              <rect x="8" y="5" width="2" height="14" rx="1"/>
              <rect x="12" y="7" width="4" height="10" rx="1"/>
              <rect x="18" y="5" width="3" height="14" rx="1"/>
            </svg>
            <span>ESCANEAR</span>
          </button>
          <button className="orders-sync-btn" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <span className="spinner-small" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            )}
            {syncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
          </button>
          <button className="orders-nav-btn" onClick={logout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="orders-main">

        {/* Título */}
        <div className="orders-page-title">
          <h1>ÓRDENES</h1>
          <p>{orders.length} órdenes totales · Mercado Libre</p>
        </div>

        {/* Stats */}
        <div className="orders-stats">
          <div className="orders-stat-card">
            <span className="orders-stat-label">TOTAL</span>
            <span className="orders-stat-value">{stats.total}</span>
          </div>
          <div className="orders-stat-card">
            <span className="orders-stat-label">PENDIENTES</span>
            <span className="orders-stat-value yellow">{stats.pending}</span>
          </div>
          <div className="orders-stat-card">
            <span className="orders-stat-label">ESCANEADAS</span>
            <span className="orders-stat-value blue">{stats.scanned}</span>
          </div>
          <div className="orders-stat-card">
            <span className="orders-stat-label">EMPACADAS</span>
            <span className="orders-stat-value green">{stats.packed}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="orders-toolbar">
          <div className="orders-search-wrapper">
            <svg className="orders-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="orders-search"
              type="text"
              placeholder="Buscar por ID o comprador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="orders-filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`orders-filter-btn ${filter === f.key ? `active-${f.key}` : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.key !== 'all' && (
                  <span className="filter-dot" style={{ background: f.color }} />
                )}
                {f.label}
                {f.key !== 'all' && (
                  <span>({stats[f.key]})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="orders-table-wrapper">
          {loading ? (
            <div className="orders-empty">
              <span className="spinner-small" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
          ) : (
            <OrderTable orders={filtered} />
          )}
        </div>

      </main>

      {/* Toast */}
      {toast && (
        <div className={`orders-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}