import { useState } from 'react'
import MarketplaceBadge from './MarketplaceBadge'
import './LogTable.css'

const ROLE_COLOR = { ADMIN: 'amber', SUPERVISOR: 'purple', PICKER: 'blue', DELIVERY: 'green' }

const fmtTime = (iso) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

const ChevronIcon = ({ open }) => (
    <svg
        width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
)

const LogRow = ({ log }) => {
    const [open, setOpen] = useState(false)
    const color = ROLE_COLOR[log.user.role] ?? 'blue'

    return (
        <>
            <tr className={`lt-row ${open ? 'lt-row--open' : ''}`} onClick={() => setOpen(v => !v)}>
                <td className="lt-cell-mono">{fmtTime(log.packedAt)}</td>
                <td>
                    <div className="lt-user-cell">
                        <span className={`lt-avatar lt-avatar--${color}`}>
                            {log.user.name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                        <span className="lt-user-name">{log.user.name}</span>
                    </div>
                </td>
                <td>
                    <span className={`lt-badge lt-badge--${log.action === 'packed' ? 'green' : 'blue'}`}>
                        {log.action === 'packed' ? 'EMPACADO' : 'ESCANEADO'}
                    </span>
                </td>
                <td className="lt-chevron-cell">
                    <span className="lt-chevron">
                        <ChevronIcon open={open} />
                    </span>
                </td>
            </tr>

            {open && (
                <tr className="lt-detail-row">
                    <td colSpan={4}>
                        <div className="lt-detail">
                            <div className="lt-detail-item">
                                <span className="lt-detail-label">ORDEN</span>
                                <span className="lt-detail-value lt-mono">
                                    {log.order.marketplace && <MarketplaceBadge marketplace={log.order.marketplace} />}{" "}
                                    #{log.order.packId ?? log.order.id}
                                </span>
                            </div>
                            <div className="lt-detail-item">
                                <span className="lt-detail-label">COMPRADOR</span>
                                <span className="lt-detail-value">{log.order.buyerNickname ?? '—'}</span>
                            </div>
                            <div className="lt-detail-item">
                                <span className="lt-detail-label">CIUDAD</span>
                                <span className="lt-detail-value">{log.order.receiverCity ?? '—'}</span>
                            </div>
                            <div className="lt-detail-item">
                                <span className="lt-detail-label">HORA EXACTA</span>
                                <span className="lt-detail-value lt-mono">
                                    {new Date(log.packedAt).toLocaleString('es-CL', {
                                        day: '2-digit', month: '2-digit',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                                    })}
                                </span>
                            </div>
                            {log.order.shippingId && !['shipped', 'delivered', 'not_delivered'].includes(log.order.shippingStatus) && (
                                <div className="lt-detail-item">
                                    <span className="lt-detail-label">ETIQUETA</span>
                                    <button
                                        className="lt-label-btn"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const token = localStorage.getItem('app_token')
                                            const id = log.order.packId ?? log.order.id
                                            window.open(`${import.meta.env.VITE_API_URL}/orders/${id}/label?token=${token}`, '_blank')
                                        }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <path d="M6 9V2h12v7" />
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                            <rect x="6" y="14" width="12" height="8" />
                                        </svg>
                                        IMPRIMIR
                                    </button>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function LogTable({ logs, loading }) {
    if (loading) return (
        <div className="lt-wrapper">
            <div className="lt-loading"><span className="lt-spin" /></div>
        </div>
    )

    if (!logs.length) return (
        <div className="lt-wrapper">
            <div className="lt-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="17" x2="13" y2="17" />
                </svg>
                <p>Sin registros para este período</p>
            </div>
        </div>
    )

    return (
        <div className="lt-wrapper">
            <table className="lt-table">
                <thead>
                    <tr>
                        <th>HORA</th>
                        <th>OPERADOR</th>
                        <th>ACCIÓN</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => <LogRow key={log.id} log={log} />)}
                </tbody>
            </table>
        </div>
    )
}