import { useEffect, useState, useMemo } from 'react'
import OrderTable from '../components/OrderTable'
import Header from '../components/Header'
import './Orders.css'

const API_URL = import.meta.env.VITE_API_URL

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})

const STATUS_FILTERS = [
  { key: 'all',     label: 'TODAS',      color: null      },
  { key: 'pending', label: 'PENDIENTE',  color: '#f59e0b' },
  { key: 'scanned', label: 'ESCANEADO',  color: '#3b82f6' },
  { key: 'packed',  label: 'EMPACADO',   color: '#16a34a' },
]

const SHIPPING_FILTERS = [
  { key: 'all',          label: 'TODAS',         color: null      },
  { key: 'por_despachar',label: 'POR DESPACHAR', color: '#f59e0b' },
  { key: 'en_transito',  label: 'EN TRÁNSITO',   color: '#3b82f6' },
  { key: 'finalizados',  label: 'FINALIZADOS',   color: '#16a34a' },
]

export default function Orders() {
  const [orders,          setOrders]          = useState([])
  const [loading,         setLoading]         = useState(false)
  const [syncing,         setSyncing]         = useState(false)
  const [statusFilter,    setStatusFilter]    = useState('all')
  const [shippingFilter,  setShippingFilter]  = useState('all')
  const [search,          setSearch]          = useState('')
  const [toast,           setToast]           = useState(null)
  const [lastSyncAt,      setLastSyncAt]      = useState(null)
  const [theme,           setTheme]           = useState(() =>
    localStorage.getItem('picking_theme') || 'light'
  )

  /* ── Tema ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  /* ── Toast ── */
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Cargar órdenes desde DB ── */
  const loadOrders = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`${API_URL}/orders`, { headers: getHeaders() })
      if (res.status === 401) { logout(); return }
      const data = await res.json()
      setOrders(data)
    } catch {
      showToast('Error cargando órdenes', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  /* ── Sync: llama a ML, guarda en DB, luego refresca ── */
  const handleSync = async () => {
    try {
      setSyncing(true)

      // 1. Sync incremental contra ML
      const syncRes = await fetch(`${API_URL}/orders/sync`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const syncData = await syncRes.json()
      if (!syncRes.ok) throw new Error(syncData.error || 'Error al sincronizar')

      // 2. Refrescar desde DB en silencio (no toca el spinner de carga)
      await loadOrders(true)

      // 3. Toast con info real del backend
      const n = syncData.total ?? 0
      const msg = n === 0
        ? '✓ Todo al día — sin cambios'
        : `✓ ${n} orden${n !== 1 ? 'es' : ''} actualizada${n !== 1 ? 's' : ''}`

      setLastSyncAt(new Date())
      showToast(msg)
    } catch (e) {
      showToast(e.message || 'Error al sincronizar', 'error')
    } finally {
      setSyncing(false)
    }
  }

  /* ── Carga inicial desde DB ── */
  useEffect(() => { loadOrders() }, [])

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total:   orders.length,
    pending: orders.filter(o => o.pickingStatus === 'pending').length,
    scanned: orders.filter(o => o.pickingStatus === 'scanned').length,
    packed:  orders.filter(o => o.pickingStatus === 'packed').length,
  }), [orders])

  /* ── Conteo envíos ── */
  const shippingCounts = useMemo(() => {
    const counts = { all: orders.length }
    SHIPPING_FILTERS.forEach(f => {
      if (f.key !== 'all')
        counts[f.key] = orders.filter(o => o.shippingCategory === f.key).length
    })
    return counts
  }, [orders])

  /* ── Filtrado + orden por fecha ── */
  const filtered = useMemo(() => {
    return orders
      .filter(o => {
        const matchStatus   = statusFilter   === 'all' || o.pickingStatus    === statusFilter
        const matchShipping = shippingFilter === 'all' || o.shippingCategory === shippingFilter
        const matchSearch   = !search ||
          o.id.toString().includes(search) ||
          o.buyerNickname?.toLowerCase().includes(search.toLowerCase())
        return matchStatus && matchShipping && matchSearch
      })
      .sort((a, b) => {
        // Ordenar por lastUpdatedAt si existe, sino por createdAt — más reciente primero
        const dateA = new Date(a.lastUpdatedAt ?? a.createdAt)
        const dateB = new Date(b.lastUpdatedAt ?? b.createdAt)
        return dateB - dateA
      })
  }, [orders, statusFilter, shippingFilter, search])

  /* ── Helpers ── */
  const formatSyncTime = (date) => {
    if (!date) return null
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="orders-root">
      <div className="orders-bg-grid" />

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onSync={handleSync}
        syncing={syncing}
        syncMsg={lastSyncAt ? `✓ ${formatSyncTime(lastSyncAt)}` : null}
      />

      <main className="orders-main">

        {/* ── Título ── */}
        <div className="orders-page-title">
          <h1>ÓRDENES</h1>
          <p>
            {orders.length} órdenes en base de datos
            {lastSyncAt && (
              <span className="orders-last-sync">
                · último sync {formatSyncTime(lastSyncAt)}
              </span>
            )}
          </p>
        </div>

        {/* ── Stats ── */}
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

        {/* ── Toolbar ── */}
        <div className="orders-toolbar">

          {/* Búsqueda */}
          <div className="orders-search-wrapper">
            <svg className="orders-search-icon" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="orders-search"
              type="text"
              placeholder="Buscar por ID o comprador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="orders-search-clear"
                onClick={() => setSearch('')} aria-label="Limpiar">×</button>
            )}
          </div>

          {/* Filtros estado picking */}
          <div className="orders-filter-group">
            <span className="filter-group-label">ESTADO</span>
            <div className="orders-filters-scroll">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`orders-filter-btn ${statusFilter === f.key ? `active-${f.key}` : ''}`}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.color && <span className="filter-dot" style={{ background: f.color }}/>}
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="filter-count">({stats[f.key]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros envío */}
          <div className="orders-filter-group">
            <span className="filter-group-label">ENVÍO</span>
            <div className="orders-filters-scroll">
              {SHIPPING_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`orders-filter-btn shipping ${shippingFilter === f.key ? 'active-shipping' : ''}`}
                  onClick={() => setShippingFilter(f.key)}
                >
                  {f.color && <span className="filter-dot" style={{ background: f.color }}/>}
                  {f.label}
                  <span className="filter-count">({shippingCounts[f.key] ?? 0})</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Filtros activos ── */}
        {(statusFilter !== 'all' || shippingFilter !== 'all' || search) && (
          <div className="orders-active-filters">
            <span className="active-filters-info">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              className="active-filters-clear"
              onClick={() => { setStatusFilter('all'); setShippingFilter('all'); setSearch('') }}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* ── Tabla ── */}
        <div className="orders-table-wrapper">
          {loading ? (
            <div className="orders-empty">
              <span className="spinner-large"/>
              <p>CARGANDO</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="orders-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <p>SIN RESULTADOS</p>
            </div>
          ) : (
            <OrderTable orders={filtered}/>
          )}
        </div>

      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className={`orders-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}