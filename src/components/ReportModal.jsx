import { useState } from 'react'
import './ReportModal.css'

// ─────────────────────────────────────────
//  OPCIONES DE PERÍODO
// ─────────────────────────────────────────

const buildPeriods = () => {
  const now = new Date()

  const dow       = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow)
  const weekEnd   = new Date(weekStart.getTime() + 6 * 86_400_000)

  const fmt = (d) => d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })

  return [
    {
      key:  'day',
      label: 'HOY',
      sub:   now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' }),
      icon:  (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
          <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
        </svg>
      ),
    },
    {
      key:  'week',
      label: 'ESTA SEMANA',
      sub:   `${fmt(weekStart)} → ${fmt(weekEnd)}`,
      icon:  (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
          <path d="M7 15h4M7 18h6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      key:  'month',
      label: 'ESTE MES',
      sub:   now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      icon:  (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
          <path d="M7 14h10M7 17h7" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]
}

// ─────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────

export default function ReportModal({ onClose, onGenerate }) {
  const [period,     setPeriod]     = useState('day')
  const [generating, setGenerating] = useState(false)

  const periods = buildPeriods()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await onGenerate(period)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-box" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="rm-header">
          <div className="rm-header-left">
            <div className="rm-header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <p className="rm-title">EXPORTAR REPORTE</p>
              <p className="rm-subtitle">Se aplicarán los filtros activos de la vista</p>
            </div>
          </div>
          <button className="rm-close" onClick={onClose}>×</button>
        </div>

        {/* ── Separador ── */}
        <div className="rm-divider" />

        {/* ── Opciones de período ── */}
        <p className="rm-section-label">PERÍODO</p>
        <div className="rm-periods">
          {periods.map(p => (
            <button
              key={p.key}
              className={`rm-period-btn ${period === p.key ? 'rm-period-btn--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              <span className={`rm-period-icon ${period === p.key ? 'rm-period-icon--active' : ''}`}>
                {p.icon}
              </span>
              <span className="rm-period-text">
                <span className="rm-period-label">{p.label}</span>
                <span className="rm-period-sub">{p.sub}</span>
              </span>
              {period === p.key && (
                <span className="rm-period-check">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Acción ── */}
        <button
          className="rm-confirm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <span className="rm-spinner" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
          {generating ? 'GENERANDO...' : 'DESCARGAR PDF'}
        </button>

      </div>
    </div>
  )
}