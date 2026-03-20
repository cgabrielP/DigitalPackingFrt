import { useState, useEffect, useMemo } from 'react'
import Layout from '../components/Layout'
import LogTable from '../components/LogTable'
import './PackingLog.css'
import { apiFetch } from '../utils/auth'

const API_URL = import.meta.env.VITE_API_URL

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('app_token')}`,
})

const todayISO = () => new Date().toISOString().split('T')[0]

const formatDateLabel = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

export default function PackingLog() {
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [userFilter, setUserFilter] = useState('all')
  const [showScans, setShowScans] = useState(false)
  const [orderSearch, setOrderSearch] = useState('')
  const [date, setDate]           = useState(todayISO())
  const [theme, setTheme]         = useState(
    () => localStorage.getItem('picking_theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('picking_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const changeDate = (offset) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setDate(d.toISOString().split('T')[0])
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from: date, to: date + 'T23:59:59' })
      if (userFilter !== 'all') params.set('userId', userFilter)
      const res  = await apiFetch(`${API_URL}/api/log?${params}`, { headers: getHeaders() })
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLogs() }, [date, userFilter])

  const users = useMemo(() => {
    const map = new Map()
    logs.forEach(l => { if (!map.has(l.user.id)) map.set(l.user.id, l.user) })
    return Array.from(map.values())
  }, [logs])

  const filtered = useMemo(() => {
    const term = orderSearch.trim().toLowerCase()
    return logs.filter(l => {
      if (!showScans && l.action !== 'packed') return false
      if (term) {
        const id = String(l.order.packId ?? l.order.id ?? '').toLowerCase()
        if (!id.includes(term)) return false
      }
      return true
    })
  }, [logs, showScans, orderSearch])

  const stats = useMemo(() => {
    const packed  = logs.filter(l => l.action === 'packed').length
    const scanned = logs.filter(l => l.action === 'scanned').length
    const byUser  = {}
    logs.filter(l => l.action === 'packed').forEach(l => {
      byUser[l.user.name] = (byUser[l.user.name] || 0) + 1
    })
    const topUser = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0]
    return { packed, scanned, topUser }
  }, [logs])

  return (
    <div className="pl-root">
      <Layout subtitle="LOG" theme={theme} onToggleTheme={toggleTheme} navPath="/orders">
        <main className="pl-page">

          <div className="pl-header">
            <div>
              <p className="pl-eyebrow">OPERACIONES</p>
              <h1 className="pl-title">LOG DE EMPAQUE</h1>
              <p className="pl-sub">Historial de escaneos y empaque por operador</p>
            </div>
          </div>

          <div className="pl-stats">
            <div className="pl-stat pl-stat--green">
              <span className="pl-stat-value">{stats.packed}</span>
              <span className="pl-stat-label">EMPACADAS</span>
            </div>
            <div className="pl-stat pl-stat--blue">
              <span className="pl-stat-value">{stats.scanned}</span>
              <span className="pl-stat-label">ESCANEADAS</span>
            </div>
            <div className="pl-stat pl-stat--amber">
              <span className="pl-stat-value">{stats.topUser?.[1] ?? '—'}</span>
              <span className="pl-stat-label">TOP OPERADOR</span>
              {stats.topUser && <span className="pl-stat-name">{stats.topUser[0]}</span>}
            </div>
          </div>

          <div className="pl-toolbar">
            <div className="pl-date-nav">
              <button className="pl-date-nav-btn" onClick={() => changeDate(-1)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <input
                type="date" className="pl-date-nav-input"
                value={date} onChange={e => setDate(e.target.value)}
              />
              <button className="pl-date-nav-btn" onClick={() => changeDate(1)} disabled={date >= todayISO()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <p className="pl-date-label">{formatDateLabel(date)}</p>

            <div className="pl-filters">
              <input
                className="pl-search"
                type="text"
                placeholder="BUSCAR ORDEN..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
              />
              <select className="pl-select" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                <option value="all">TODOS LOS OPERADORES</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button
                className={`pl-toggle ${showScans ? 'pl-toggle--active' : ''}`}
                onClick={() => setShowScans(v => !v)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="7" width="3" height="10" rx="1"/>
                  <rect x="8" y="5" width="2" height="14" rx="1"/>
                  <rect x="12" y="7" width="4" height="10" rx="1"/>
                  <rect x="18" y="5" width="3" height="14" rx="1"/>
                </svg>
                VER SCANS
              </button>
            </div>
          </div>

          <LogTable logs={filtered} loading={loading} />

        </main>
      </Layout>
    </div>
  )
}