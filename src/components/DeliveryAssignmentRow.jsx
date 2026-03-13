import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './DeliveryAssignmentRow.css'

/* ── Zoom overlay — portal para no romper la estructura table ── */
function ImageZoom({ src, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="dar-zoom-overlay" onClick={onClose}>
      <div className="dar-zoom-inner" onClick={e => e.stopPropagation()}>
        <img src={src} alt={title} className="dar-zoom-img" />
        {title && <p className="dar-zoom-title">{title}</p>}
        <button className="dar-zoom-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SHIPPING_STATUS = {
  delivered:     { label: 'ENTREGADO',    cls: 'delivered' },
  shipped:       { label: 'EN CAMINO',    cls: 'shipped'   },
  not_delivered: { label: 'NO ENTREGADO', cls: 'failed'    },
}

export default function DeliveryAssignmentRow({ assignment, index, onUnassign, canManage }) {
  const [expanded,    setExpanded]    = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null) // { src, title }
  const { order, deliveryUser, assignedAt, paymentAmount, notes } = assignment

  const shipStatus = order.status === 'cancelled'
    ? SHIPPING_STATUS.not_delivered
    : (SHIPPING_STATUS[order.shippingStatus] ?? { label: order.shippingStatus?.toUpperCase() ?? '—', cls: 'other' })

  const isDelivered = order.shippingStatus === 'delivered'

  /* Subcomponentes reutilizados en desktop y mobile */
  const Thumbs = () => (
    <div className="dar-items">
      {order.orderItems?.slice(0, 3).map(item =>
        item.thumbnail
          ? (
            <img
              key={item.id}
              src={item.thumbnail}
              alt={item.title}
              className="dar-thumb dar-thumb--zoomable"
              title={item.title}
              onClick={() => setZoomedImage({ src: item.thumbnail, title: item.title })}
              onError={e => { e.target.style.display = 'none' }}
            />
          )
          : <div key={item.id} className="dar-thumb-placeholder" title={item.title}>📦</div>
      )}
      {order.orderItems?.length > 3 && (
        <div className="dar-thumb-placeholder">+{order.orderItems.length - 3}</div>
      )}
    </div>
  )

  const Badge = () => (
    <span className={`dar-badge dar-badge--${shipStatus.cls}`}>
      <span className="dar-dot" />{shipStatus.label}
    </span>
  )

  const PayAmount = () => (
    <span className={isDelivered ? 'dar-amount dar-amount--paid' : 'dar-amount'}>
      ${paymentAmount?.toLocaleString('es-CL')}
    </span>
  )

  return (
    <>
      {zoomedImage && (
        <ImageZoom
          src={zoomedImage.src}
          title={zoomedImage.title}
          onClose={() => setZoomedImage(null)}
        />
      )}
    <tr
      className={`dar-row ${expanded ? 'dar-row--expanded' : ''}`}
      style={{ animationDelay: `${index * 35}ms` }}
    >

      {/* ═══════════════════════════════
          DESKTOP — celdas normales
      ═══════════════════════════════ */}
      <td className="dar-id dar-desk">#{order.packId ?? order.id}</td>

      <td className="dar-buyer dar-desk">{order.buyerNickname ?? '—'}</td>

      <td className="dar-desk">
        <Thumbs />
      </td>

      <td className="dar-desk">
        <Badge />
      </td>

      <td className="dar-city dar-desk">{order.receiverCity ?? '—'}</td>

      {canManage && (
        <td className="dar-delivery dar-desk">
          <div className="dar-user-cell">
            <span className="dar-avatar">{deliveryUser?.name?.[0]?.toUpperCase() ?? '?'}</span>
            <span>{deliveryUser?.name ?? '—'}</span>
          </div>
        </td>
      )}

      <td className="dar-date dar-desk">{formatDate(assignedAt)}</td>

      <td className="dar-payment dar-desk">
        <PayAmount />
      </td>

      <td className="dar-notes dar-desk" title={notes ?? ''}>
        {notes ? <span className="dar-notes-text">{notes}</span> : null}
      </td>

      {canManage && (
        <td className="dar-desk dar-action-cell">
          <button
            className="dar-btn-unassign"
            onClick={() => onUnassign(order.id, order.packId ?? order.id)}
            title="Quitar asignación"
          >✕</button>
        </td>
      )}

      {/* ═══════════════════════════════
          MOBILE — card expandible
      ═══════════════════════════════ */}
      <td className="dar-mob">

        {/* Cabecera siempre visible — click expande */}
        <div className="dar-mob-summary" onClick={() => setExpanded(v => !v)}>
          <div className="dar-mob-info">
            <div className="dar-mob-top">
              <span className="dar-id">#{order.packId ?? order.id}</span>
              <Badge />
            </div>
            <span className="dar-mob-buyer">{order.buyerNickname ?? '—'}</span>
            {order.receiverCity && (
              <span className="dar-mob-city">{order.receiverCity}</span>
            )}
          </div>

          <div className="dar-mob-meta">
            <PayAmount />
            <svg
              className={`dar-chevron ${expanded ? 'dar-chevron--open' : ''}`}
              width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* Detalle expandido */}
        {expanded && (
          <div className="dar-mob-body">

            <div className="dar-mob-detail">
              <span className="dar-mob-label">PRODUCTOS</span>
              <Thumbs />
            </div>

            {canManage && deliveryUser && (
              <div className="dar-mob-detail">
                <span className="dar-mob-label">DELIVERY</span>
                <div className="dar-user-cell">
                  <span className="dar-avatar">{deliveryUser.name?.[0]?.toUpperCase() ?? '?'}</span>
                  <span>{deliveryUser.name}</span>
                </div>
              </div>
            )}

            <div className="dar-mob-detail">
              <span className="dar-mob-label">ASIGNADO</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--text-muted)' }}>
                {formatDate(assignedAt)}
              </span>
            </div>

            {notes && (
              <div className="dar-mob-detail">
                <span className="dar-mob-label">NOTAS</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{notes}</span>
              </div>
            )}

            {canManage && (
              <div className="dar-mob-actions">
                <button
                  className="dar-btn-unassign-mob"
                  onClick={() => onUnassign(order.id, order.packId ?? order.id)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Quitar asignación
                </button>
              </div>
            )}
          </div>
        )}
      </td>

    </tr>
    </>
  )
}