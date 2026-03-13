import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import Layout from '../components/Layout'
import DeliveryAssignmentRow from '../components/DeliveryAssignmentRow'
import CameraScanner from '../components/CameraScanner'
import './AssignDelivery.css'

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
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

/* ── Toast ── */
const Toast = ({ toast }) => {
  if (!toast) return null
  return (
    <div className={`adl-toast adl-toast--${toast.type}`}>
      {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
    </div>
  )
}

/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
export default function AssignDelivery() {
  // ── Datos ──
  const [orders,        setOrders]        = useState([])
  const [assignments,   setAssignments]   = useState([])
  const [deliveryUsers, setDeliveryUsers] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [date,          setDate]          = useState(todayISO())
  const [tab,           setTab]           = useState('pending') // 'pending' | 'assigned'
  const [toast,         setToast]         = useState(null)
  const [theme,         setTheme]         = useState(() => localStorage.getItem('picking_theme') || 'light')

  // ── Scanner / búsqueda ──
  const [code,        setCode]        = useState('')
  const [foundOrder,  setFoundOrder]  = useState(null)
  const [scanWarning, setScanWarning] = useState(null)
  const [scanError,   setScanError]   = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scannerMode, setScannerMode] = useState(false)
  const [cameraOpen,  setCameraOpen]  = useState(false)  // ← cámara

  // ── Asignación ──
  const [selectedUser, setSelectedUser] = useState('')
  const [assignNotes,  setAssignNotes]  = useState('')
  const [assigning,    setAssigning]    = useState(false)

  // ── Filtros tab assigned ──
  const [search,          setSearch]          = useState('')
  const [dateRange,       setDateRange]       = useState([null, null])
  const [calendarOpen,    setCalendarOpen]    = useState(false)
  const [cityFilter,      setCityFilter]      = useState('all')
  const [cityOpen,        setCityOpen]        = useState(false)
  const [deliveryFilter,  setDeliveryFilter]  = useState('all')   // ← NUEVO
  const [deliveryOpen,    setDeliveryOpen]    = useState(false)   // ← NUEVO
  const [startDate, endDate] = dateRange

  // ── Refs ──
  const inputRef         = useRef(null)
  const scannerBuffer    = useRef('')
  const scannerTimer     = useRef(null)
  const calendarRef      = useRef(null)
  const calendarBtn      = useRef(null)
  const cityRef          = useRef(null)
  const deliveryFilterRef = useRef(null)  // ← NUEVO

  const session = getSession()

  /* ── Tema ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  /* ── Cerrar dropdowns al clickear fuera ── */
  useEffect(() => {
    const handler = (e) => {
      if (
        calendarRef.current && !calendarRef.current.contains(e.target) &&
        calendarBtn.current && !calendarBtn.current.contains(e.target)
      ) setCalendarOpen(false)
      if (cityRef.current && !cityRef.current.contains(e.target))
        setCityOpen(false)
      if (deliveryFilterRef.current && !deliveryFilterRef.current.contains(e.target))
        setDeliveryOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Auto-focus al limpiar resultado ── */
  useEffect(() => {
    if (!foundOrder) setTimeout(() => inputRef.current?.focus(), 50)
  }, [foundOrder])

  /* ── Captura global de teclado para pistola lectora ── */
  useEffect(() => {
    const INTERVAL = 50
    const onKeyDown = (e) => {
      const active = document.activeElement
      const isInput = active === inputRef.current
      if (isInput) return
      const tag = active?.tagName?.toLowerCase()
      if (['input', 'textarea', 'select', 'button'].includes(tag)) return
      if (e.ctrlKey || e.altKey || e.metaKey) return

      if (e.key === 'Enter') {
        if (scannerBuffer.current.trim()) {
          const captured = scannerBuffer.current
          scannerBuffer.current = ''
          clearTimeout(scannerTimer.current)
          setScannerMode(false)
          submitCode(captured)
        }
        return
      }
      if (e.key.length === 1) {
        scannerBuffer.current += e.key
        setScannerMode(true)
        setCode(scannerBuffer.current)
        clearTimeout(scannerTimer.current)
        scannerTimer.current = setTimeout(() => {
          if (scannerBuffer.current.trim().length >= 4) {
            const captured = scannerBuffer.current
            scannerBuffer.current = ''
            setScannerMode(false)
            submitCode(captured)
          } else {
            inputRef.current?.focus()
            scannerBuffer.current = ''
            setScannerMode(false)
          }
        }, INTERVAL * 3)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(scannerTimer.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Carga de datos ── */
  useEffect(() => { loadAll() }, [date])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ordersRes, assignmentsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/orders`, { headers: getHeaders() }),
        fetch(`${API_URL}/delivery/assignments?date=${date}`, { headers: getHeaders() }),
        fetch(`${API_URL}/admin/users`, { headers: getHeaders() }),
      ])
      const [ordersData, assignmentsData, usersData] = await Promise.all([
        ordersRes.json(),
        assignmentsRes.json(),
        usersRes.json(),
      ])
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : [])
      setDeliveryUsers((Array.isArray(usersData) ? usersData : []).filter(u => u.role === 'DELIVERY' && u.isActive))
    } catch {
      showToast('error', 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Navegación de días ── */
  const changeDate = (offset) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setDate(d.toISOString().split('T')[0])
  }

  /* ── Memos ── */
  const assignedOrderIds = useMemo(
    () => new Set(assignments.map(a => a.orderId)),
    [assignments]
  )

  /* Total a pagar del día — no canceladas y con shippingStatus delivered */
  const totalPagarHoy = useMemo(() =>
    assignments
      .filter(a => a.order.status !== 'cancelled' && a.order.shippingStatus === 'delivered')
      .reduce((sum, a) => sum + (a.paymentAmount || 0), 0),
    [assignments]
  )

  /* Total filtrado por delivery seleccionado */
  const totalPagarFiltered = useMemo(() => {
    if (deliveryFilter === 'all') return null
    return assignments
      .filter(a =>
        a.deliveryUser?.id === deliveryFilter &&
        a.order.status !== 'cancelled' &&
        a.order.shippingStatus === 'delivered'
      )
      .reduce((sum, a) => sum + (a.paymentAmount || 0), 0)
  }, [assignments, deliveryFilter])

  const cityOptionsAssigned = useMemo(() => {
    const cities = assignments.map(a => a.order?.receiverCity).filter(Boolean)
    return ['all', ...new Set(cities)]
  }, [assignments])

  const toDateOnly = (value) => {
    if (!value) return null
    const d = new Date(value)
    if (isNaN(d)) return null
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const dateLabel = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    if (!startDate && !endDate) return 'FECHA'
    if (startDate && !endDate)  return fmt(startDate)
    return `${fmt(startDate)} → ${fmt(endDate)}`
  }, [startDate, endDate])

  /* Asignaciones filtradas — incluye filtro de delivery */
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const matchDelivery = deliveryFilter === 'all' || a.deliveryUser?.id === deliveryFilter

      const matchSearch = search === '' ||
        (a.order?.buyerNickname ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.order?.packId ?? a.order?.id ?? '').toString().includes(search) ||
        (a.deliveryUser?.name ?? '').toLowerCase().includes(search.toLowerCase())

      const matchCity = cityFilter === 'all' || a.order?.receiverCity === cityFilter

      let matchDate = true
      if (startDate || endDate) {
        const d = toDateOnly(a.assignedAt)
        if (!d) return false
        if (startDate && d < toDateOnly(startDate)) matchDate = false
        if (endDate   && d > toDateOnly(endDate))   matchDate = false
      }

      return matchDelivery && matchSearch && matchCity && matchDate
    })
  }, [assignments, search, cityFilter, startDate, endDate, deliveryFilter])

  const hasActiveFilters = cityFilter !== 'all' || startDate || endDate || deliveryFilter !== 'all'

  const selectedDeliveryName = useMemo(
    () => deliveryUsers.find(u => u.id === deliveryFilter)?.name ?? null,
    [deliveryUsers, deliveryFilter]
  )

  /* ── Scanner submit ── */
  const submitCode = useCallback(async (value) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setScanLoading(true)
    setScanError(null)
    setScanWarning(null)
    setFoundOrder(null)
    setSelectedUser('')
    setAssignNotes('')

    try {
      const match = orders.find(o =>
        o.id === trimmed ||
        o.packId === trimmed ||
        o.shippingId === trimmed ||
        o.displayIdentifier?.toString() === trimmed
      )

      if (!match) throw new Error('Orden no encontrada')

      if (assignedOrderIds.has(match.id)) {
        throw new Error('Esta orden ya tiene un delivery asignado')
      }

      if (match.pickingStatus !== 'packed') {
        setScanWarning(
          `La orden #${match.packId ?? match.id} tiene estado "${match.pickingStatus}" — no está empacada todavía`
        )
      }

      setFoundOrder(match)
    } catch (err) {
      setScanError(err.message)
    } finally {
      setScanLoading(false)
      setCode('')
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [orders, assignedOrderIds])

  const handleScan = (e) => {
    e.preventDefault()
    const value = inputRef.current?.value || code
    submitCode(value)
  }

  /* ── Confirmar asignación ── */
  const handleAssignFound = async () => {
    if (!foundOrder || !selectedUser) return
    setAssigning(true)
    try {
      const res = await fetch(`${API_URL}/delivery/assign`, {
        method:  'POST',
        headers: getHeaders(),
        body:    JSON.stringify({ orderId: foundOrder.id, deliveryUserId: selectedUser, notes: assignNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      loadAll()
      setFoundOrder(null)
      setSelectedUser('')
      setAssignNotes('')
      setScanWarning(null)
      showToast('success', 'Orden asignada correctamente')
      setTab('assigned')
    } catch (err) {
      setScanError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  /* ── Quitar asignación ── */
  const handleUnassign = async (orderId, displayId) => {
    if (!confirm(`¿Quitar la asignación de la orden #${displayId}?`)) return
    try {
      const res = await fetch(`${API_URL}/delivery/assign/${orderId}`, {
        method: 'DELETE', headers: getHeaders(),
      })
      if (!res.ok) throw new Error()
      setAssignments(prev => prev.filter(a => a.orderId !== orderId))
      showToast('success', 'Asignación eliminada')
    } catch {
      showToast('error', 'No se pudo eliminar la asignación')
    }
  }

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="adl-root">
      <div className="adl-bg-grid" />
      <Layout subtitle="DELIVERY" theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
        <div className="adl-page">

          {/* ── Header ── */}
          <header className="adl-header">
            <div>
              <p className="adl-eyebrow">OPERACIONES</p>
              <h1 className="adl-title">ASIGNAR DELIVERY</h1>
              <p className="adl-sub">Escaneá o ingresá el número de orden para asignarla</p>
            </div>

            {/* Navegación de días */}
            <div className="adl-date-nav">
              <button className="adl-date-nav-btn" onClick={() => changeDate(-1)} title="Día anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <input
                type="date"
                className="adl-date-nav-input"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <button
                className="adl-date-nav-btn"
                onClick={() => changeDate(1)}
                title="Día siguiente"
                disabled={date >= todayISO()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </header>

          <p className="adl-date-label">{formatDateLabel(date)}</p>

          <Toast toast={toast} />

          {/* ── Stats ── */}
          <div className="adl-stats">
            <div className="adl-stat">
              <span className="adl-stat-value adl-stat-value--blue">{assignments.length}</span>
              <span className="adl-stat-label">ASIGNADAS HOY</span>
            </div>
            <div className="adl-stat">
              <span className="adl-stat-value adl-stat-value--green">
                {assignments.filter(a => a.order?.shippingStatus === 'delivered').length}
              </span>
              <span className="adl-stat-label">ENTREGADAS</span>
            </div>
            <div className="adl-stat">
              <span className="adl-stat-value">{deliveryUsers.length}</span>
              <span className="adl-stat-label">DELIVERIES</span>
            </div>
            {/* Stat de total a pagar — suma no-canceladas entregadas */}
            <div className="adl-stat adl-stat--highlight">
              <span className="adl-stat-value adl-stat-value--green">
                ${totalPagarHoy.toLocaleString('es-CL')}
              </span>
              <span className="adl-stat-label">A PAGAR HOY</span>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="adl-toolbar">

            {tab === 'assigned' && (
              <div className="adl-search-wrapper">
                <svg className="adl-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  className="adl-search"
                  placeholder="Buscar por orden, comprador o delivery..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}

            <div className="adl-filters-row">

              {/* Tabs ASIGNAR / ASIGNADAS */}
              <div className="adl-filter-group">
                <span className="adl-filter-label">VISTA</span>
                <div className="adl-tabs">
                  <button
                    className={`adl-tab ${tab === 'pending' ? 'adl-tab--active' : ''}`}
                    onClick={() => setTab('pending')}
                  >
                    ASIGNAR
                  </button>
                  <button
                    className={`adl-tab ${tab === 'assigned' ? 'adl-tab--active' : ''}`}
                    onClick={() => setTab('assigned')}
                  >
                    ASIGNADAS
                    {assignments.length > 0 && (
                      <span className="adl-tab-badge adl-tab-badge--blue">{assignments.length}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filtros — solo en tab assigned */}
              {tab === 'assigned' && (
                <>
                  {/* ── Filtro por DELIVERY ── */}
                  {deliveryUsers.length > 0 && (
                    <div className="adl-filter-group">
                      <span className="adl-filter-label">DELIVERY</span>
                      <div className="adl-city-wrapper" ref={deliveryFilterRef}>
                        <button
                          className={`adl-city-btn ${deliveryFilter !== 'all' ? 'adl-city-btn--active' : ''}`}
                          onClick={() => setDeliveryOpen(v => !v)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                          </svg>
                          {deliveryFilter === 'all' ? 'TODOS' : selectedDeliveryName?.toUpperCase()}
                          {deliveryFilter !== 'all' && (
                            <span
                              className="adl-city-clear"
                              onClick={e => { e.stopPropagation(); setDeliveryFilter('all') }}
                            >×</span>
                          )}
                          <span className={`adl-city-chevron ${deliveryOpen ? 'adl-city-chevron--open' : ''}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </span>
                        </button>
                        {deliveryOpen && (
                          <div className="adl-city-dropdown">
                            <button
                              className={`adl-city-option ${deliveryFilter === 'all' ? 'adl-city-option--active' : ''}`}
                              onClick={() => { setDeliveryFilter('all'); setDeliveryOpen(false) }}
                            >
                              TODOS LOS DELIVERIES
                              <span className="adl-city-count">{assignments.length}</span>
                            </button>
                            {deliveryUsers.map(u => {
                              const count = assignments.filter(a => a.deliveryUser?.id === u.id).length
                              const paid  = assignments
                                .filter(a => a.deliveryUser?.id === u.id && a.order.status !== 'cancelled' && a.order.shippingStatus === 'delivered')
                                .reduce((s, a) => s + (a.paymentAmount || 0), 0)
                              return (
                                <button
                                  key={u.id}
                                  className={`adl-city-option ${deliveryFilter === u.id ? 'adl-city-option--active' : ''}`}
                                  onClick={() => { setDeliveryFilter(u.id); setDeliveryOpen(false) }}
                                >
                                  <span className="adl-delivery-opt-name">
                                    <span className="adl-delivery-opt-avatar">
                                      {u.name?.[0]?.toUpperCase() ?? '?'}
                                    </span>
                                    {u.name.toUpperCase()}
                                  </span>
                                  <span className="adl-delivery-opt-meta">
                                    {paid > 0 && (
                                      <span className="adl-delivery-opt-paid">${paid.toLocaleString('es-CL')}</span>
                                    )}
                                    <span className="adl-city-count">{count}</span>
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Filtro por COMUNA ── */}
                  {cityOptionsAssigned.length > 2 && (
                    <div className="adl-filter-group">
                      <span className="adl-filter-label">COMUNA</span>
                      <div className="adl-city-wrapper" ref={cityRef}>
                        <button
                          className={`adl-city-btn ${cityFilter !== 'all' ? 'adl-city-btn--active' : ''}`}
                          onClick={() => setCityOpen(v => !v)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {cityFilter === 'all' ? 'TODAS' : cityFilter.toUpperCase()}
                          {cityFilter !== 'all' && (
                            <span className="adl-city-clear" onClick={e => { e.stopPropagation(); setCityFilter('all') }}>×</span>
                          )}
                          <span className={`adl-city-chevron ${cityOpen ? 'adl-city-chevron--open' : ''}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </span>
                        </button>
                        {cityOpen && (
                          <div className="adl-city-dropdown">
                            {cityOptionsAssigned.map(city => {
                              const count = city === 'all'
                                ? assignments.length
                                : assignments.filter(a => a.order?.receiverCity === city).length
                              return (
                                <button
                                  key={city}
                                  className={`adl-city-option ${cityFilter === city ? 'adl-city-option--active' : ''}`}
                                  onClick={() => { setCityFilter(city); setCityOpen(false) }}
                                >
                                  {city === 'all' ? 'TODAS LAS COMUNAS' : city.toUpperCase()}
                                  <span className="adl-city-count">{count}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Filtro por FECHA ── */}
                  <div className="adl-filter-group">
                    <span className="adl-filter-label">FECHA ASIGNACIÓN</span>
                    <div className="adl-date-wrapper">
                      <button
                        ref={calendarBtn}
                        className={`adl-date-btn ${startDate || endDate ? 'adl-date-btn--active' : ''}`}
                        onClick={() => setCalendarOpen(v => !v)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2"/>
                          <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        {dateLabel}
                        {(startDate || endDate) && (
                          <span
                            className="adl-date-clear"
                            onClick={e => { e.stopPropagation(); setDateRange([null, null]) }}
                          >×</span>
                        )}
                      </button>
                      {calendarOpen && (
                        <div ref={calendarRef} className="adl-calendar-popup">
                          <DatePicker
                            selected={startDate}
                            onChange={update => {
                              setDateRange(update)
                              if (update[0] && update[1]) setCalendarOpen(false)
                            }}
                            startDate={startDate}
                            endDate={endDate}
                            selectsRange
                            inline
                          />
                          <div className="adl-cal-footer">
                            <button className="adl-cal-clear" onClick={() => { setDateRange([null, null]); setCalendarOpen(false) }}>
                              Limpiar
                            </button>
                            <button className="adl-cal-close" onClick={() => setCalendarOpen(false)}>
                              Cerrar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Filtros activos ── */}
            {hasActiveFilters && tab === 'assigned' && (
              <div className="adl-active-filters">
                <span>
                  {filteredAssignments.length} resultado{filteredAssignments.length !== 1 ? 's' : ''}
                  {deliveryFilter !== 'all' && (
                    <span style={{ color: '#34d399', marginLeft: 8 }}>· {selectedDeliveryName}</span>
                  )}
                  {deliveryFilter !== 'all' && totalPagarFiltered !== null && totalPagarFiltered > 0 && (
                    <span style={{ color: '#34d399', marginLeft: 4 }}>
                      · <strong>${totalPagarFiltered.toLocaleString('es-CL')}</strong> a pagar
                    </span>
                  )}
                  {cityFilter !== 'all' && (
                    <span style={{ color: '#06b6d4', marginLeft: 8 }}>· {cityFilter}</span>
                  )}
                  {(startDate || endDate) && (
                    <span style={{ color: '#8b5cf6', marginLeft: 8 }}>· {dateLabel}</span>
                  )}
                </span>
                <button
                  className="adl-active-filters-clear"
                  onClick={() => { setDeliveryFilter('all'); setCityFilter('all'); setDateRange([null, null]) }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              CONTENIDO POR TAB
          ════════════════════════════════════════ */}

          {/* Scanner de cámara — portal sobre todo */}
          {cameraOpen && (
            <CameraScanner
              onScan={(code) => {
                setCameraOpen(false)
                submitCode(code)
              }}
              onClose={() => setCameraOpen(false)}
            />
          )}

          {loading ? (
            <div className="adl-empty"><span className="adl-spin adl-spin--lg" /></div>

          ) : tab === 'pending' ? (

            /* ── Tab: ASIGNAR (scanner) ── */
            <div className="adl-scan-section">

              <div className="adl-scan-form-wrapper">
                <div className="adl-scan-header">
                  <p className="adl-scan-label">ESCANEAR O INGRESAR N° DE ORDEN</p>
                  <span className={`adl-scan-indicator ${scannerMode ? 'adl-scan-indicator--active' : ''}`}>
                    <span className="adl-scan-dot" />
                    {scannerMode ? 'LEYENDO...' : 'LISTO'}
                  </span>
                </div>
                <form className="adl-scan-form" onSubmit={handleScan}>
                  <div className="adl-scan-input-wrapper">
                    <svg className="adl-scan-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="7" width="3" height="10" rx="1"/>
                      <rect x="8" y="5" width="2" height="14" rx="1"/>
                      <rect x="12" y="7" width="4" height="10" rx="1"/>
                      <rect x="18" y="5" width="3" height="14" rx="1"/>
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      className={`adl-scan-input ${scannerMode ? 'adl-scan-input--scanning' : ''}`}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      placeholder="ID de orden o escanea el código..."
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    {code && (
                      <button
                        type="button"
                        className="adl-scan-clear"
                        onClick={() => { setCode(''); inputRef.current?.focus() }}
                      >×</button>
                    )}
                  </div>
                  <button type="submit" className="adl-btn-primary" disabled={scanLoading}>
                    {scanLoading
                      ? <span className="adl-spin" />
                      : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                      )
                    }
                    {scanLoading ? 'BUSCANDO...' : 'BUSCAR'}
                  </button>

                  {/* Botón de cámara — solo en mobile */}
                  <button
                    type="button"
                    className="adl-btn-camera"
                    onClick={() => setCameraOpen(true)}
                    title="Escanear con cámara"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </button>
                </form>
                <p className="adl-scan-hint">
                  Ingresá el ID, escaneá con la pistola, o usá la cámara del celular
                </p>
              </div>

              {scanWarning && (
                <div className="adl-scan-warning">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {scanWarning}
                </div>
              )}

              {scanError && (
                <div className="adl-scan-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {scanError}
                </div>
              )}

              {foundOrder && (
                <div className="adl-found-card">
                  <div className="adl-found-header">
                    <div>
                      <p className="adl-found-id">#{foundOrder.packId ?? foundOrder.id}</p>
                      <p className="adl-found-buyer">{foundOrder.buyerNickname ?? '—'}</p>
                      {foundOrder.receiverCity && (
                        <p className="adl-found-city">{foundOrder.receiverCity}</p>
                      )}
                    </div>
                    <div className="adl-found-thumbs">
                      {foundOrder.orderItems?.slice(0, 4).map(item =>
                        item.thumbnail
                          ? (
                            <img
                              key={item.id}
                              src={item.thumbnail}
                              alt={item.title}
                              className="dar-thumb"
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          )
                          : (
                            <div key={item.id} className="dar-thumb-placeholder" title={item.title}>📦</div>
                          )
                      )}
                    </div>
                  </div>

                  <div className="adl-found-divider" />

                  <p className="adl-label">ASIGNAR A</p>
                  <div className="adl-delivery-list">
                    {deliveryUsers.length === 0
                      ? <p className="adl-no-delivery">No hay usuarios con rol Delivery activos</p>
                      : deliveryUsers.map(u => (
                          <button
                            key={u.id}
                            className={`adl-delivery-option ${selectedUser === u.id ? 'adl-delivery-option--active' : ''}`}
                            onClick={() => setSelectedUser(u.id)}
                          >
                            <span className="adl-delivery-avatar">
                              {u.name?.[0]?.toUpperCase() ?? '?'}
                            </span>
                            <span className="adl-delivery-name">{u.name}</span>
                          </button>
                        ))
                    }
                  </div>

                  <div className="adl-field" style={{ marginTop: 14 }}>
                    <p className="adl-label">NOTAS (opcional)</p>
                    <input
                      className="adl-input"
                      placeholder="Instrucciones para el delivery..."
                      value={assignNotes}
                      onChange={e => setAssignNotes(e.target.value)}
                    />
                  </div>

                  {scanError && (
                    <div className="adl-scan-error" style={{ marginTop: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {scanError}
                    </div>
                  )}

                  <div className="adl-found-footer">
                    <button
                      className="adl-btn-ghost"
                      onClick={() => {
                        setFoundOrder(null)
                        setScanWarning(null)
                        setScanError(null)
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      className="adl-btn-primary"
                      onClick={handleAssignFound}
                      disabled={assigning || !selectedUser}
                    >
                      {assigning && <span className="adl-spin" />}
                      {assigning ? 'ASIGNANDO...' : 'CONFIRMAR ASIGNACIÓN'}
                    </button>
                  </div>
                </div>
              )}

              {!foundOrder && !scanError && !scanLoading && (
                <div className="adl-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                    <rect x="3" y="7" width="3" height="10" rx="1"/>
                    <rect x="8" y="5" width="2" height="14" rx="1"/>
                    <rect x="12" y="7" width="4" height="10" rx="1"/>
                    <rect x="18" y="5" width="3" height="14" rx="1"/>
                  </svg>
                  <p>ESPERANDO ESCANEO</p>
                </div>
              )}
            </div>

          ) : (

            /* ── Tab: ASIGNADAS ── */
            filteredAssignments.length === 0 ? (
              <div className="adl-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <p>SIN ASIGNACIONES PARA ESTA FECHA</p>
              </div>
            ) : (
              <div className="adl-table-wrapper">
                <table className="adl-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>COMPRADOR</th>
                      <th>PRODUCTOS</th>
                      <th>ESTADO ENVÍO</th>
                      <th className="adl-th-city">CIUDAD</th>
                      <th>DELIVERY</th>
                      <th className="adl-th-date">ASIGNADO</th>
                      <th>PAGO</th>
                      <th className="adl-th-notes">NOTAS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((a, i) => (
                      <DeliveryAssignmentRow
                        key={a.id}
                        assignment={a}
                        index={i}
                        canManage={true}
                        onUnassign={handleUnassign}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

        </div>
      </Layout>
    </div>
  )
}