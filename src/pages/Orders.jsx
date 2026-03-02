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
  { key: 'all',     label: 'TODAS',     color: null        },
  { key: 'pending', label: 'PENDIENTE', color: '#f59e0b'   },
  { key: 'scanned', label: 'ESCANEADO', color: '#3b82f6'   },
  { key: 'packed',  label: 'EMPACADO',  color: '#16a34a'   },
]

const SHIPPING_FILTERS = [
  { key: 'all',           label: 'TODOS'      },
  { key: 'me2',           label: 'ME2'        },
  { key: 'me1',           label: 'ME1'        },
  { key: 'not_specified', label: 'SIN ENVÍO'  },
  { key: 'pickup',        label: 'RETIRO'     },
]

export default function Orders() {
  const [orders,          setOrders]          = useState([])
  const [loading,         setLoading]         = useState(false)
  const [syncing,         setSyncing]         = useState(false)
  const [statusFilter,    setStatusFilter]    = useState('all')
  const [shippingFilter,  setShippingFilter]  = useState('all')
  const [search,          setSearch]          = useState('')
  const [toast,           setToast]           = useState(null)
  const [theme,           setTheme]           = useState(() =>
    localStorage.getItem('picking_theme') || 'light'
  )

  // Aplicar tema al root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))

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
    } catch {
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

  // Conteo de envíos para badges
  const shippingCounts = useMemo(() => {
    const counts = {}
    SHIPPING_FILTERS.forEach(f => {
      if (f.key !== 'all') {
        counts[f.key] = orders.filter(o =>
          (o.shippingType || 'not_specified').toLowerCase() === f.key
        ).length
      }
    })
    counts.all = orders.length
    return counts
  }, [orders])

  // Filtrado + búsqueda combinados
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchStatus   = statusFilter === 'all' || o.pickingStatus === statusFilter
      const matchShipping = shippingFilter === 'all' ||
        (o.shippingType || 'not_specified').toLowerCase() === shippingFilter
      const matchSearch   = !search ||
        o.id.toString().includes(search) ||
        o.buyerNickname?.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchShipping && matchSearch
    })
  }, [orders, statusFilter, shippingFilter, search])

  return (
    <div className="orders-root">
      <div className="orders-bg-grid" />

      {/* ── Header ── */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onSync={handleSync}
        syncing={syncing}
      />

      <main className="orders-main">

        {/* ── Título ── */}
        <div className="orders-page-title">
          <h1>ÓRDENES</h1>
          <p>{orders.length} órdenes totales · Mercado Libre</p>
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
            {search && (
              <button className="orders-search-clear" onClick={() => setSearch('')} aria-label="Limpiar">
                ×
              </button>
            )}
          </div>

          {/* Filtros de estado */}
          <div className="orders-filter-group">
            <span className="filter-group-label">ESTADO</span>
            <div className="orders-filters-scroll">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`orders-filter-btn ${statusFilter === f.key ? `active-${f.key}` : ''}`}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.color && <span className="filter-dot" style={{ background: f.color }} />}
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="filter-count">({stats[f.key]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros de envío */}
          <div className="orders-filter-group">
            <span className="filter-group-label">ENVÍO</span>
            <div className="orders-filters-scroll">
              {SHIPPING_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`orders-filter-btn shipping ${shippingFilter === f.key ? 'active-shipping' : ''}`}
                  onClick={() => setShippingFilter(f.key)}
                >
                  {f.label}
                  <span className="filter-count">({shippingCounts[f.key] ?? 0})</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Resultado del filtro ── */}
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
              <span className="spinner-large" />
              <p>CARGANDO</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="orders-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <p>SIN RESULTADOS</p>
            </div>
          ) : (
            <OrderTable orders={filtered} />
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