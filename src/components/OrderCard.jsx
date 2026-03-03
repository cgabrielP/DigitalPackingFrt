import { useState } from 'react'
import './OrderCard.css'

const BADGE_CLS   = { pending: 'pending', scanned: 'scanned', packed: 'packed' }
const BADGE_LABEL = { pending: 'PENDIENTE', scanned: 'ESCANEADO', packed: 'EMPACADO' }

const ImagePlaceholder = () => (
  <div className="order-item-img-placeholder">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
  </div>
)

/* ── Lightbox ── */
const Lightbox = ({ item, onClose }) => {
  if (!item) return null
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <img src={item.thumbnail} alt={item.title} className="lightbox-img" />
        <div className="lightbox-info">
          <p className="lightbox-title">{item.title}</p>
          {item.variation && (
            <span className="lightbox-variation">{item.variation}</span>
          )}
          <span className="lightbox-qty">×{item.quantity}</span>
        </div>
      </div>
    </div>
  )
}

const OrderCard = ({ order, packed, onPack }) => {
  const [lightboxItem, setLightboxItem] = useState(null)
  const [imgErrors, setImgErrors]       = useState({})

  const badgeCls   = BADGE_CLS[order.pickingStatus]   || 'pending'
  const badgeLabel = BADGE_LABEL[order.pickingStatus] || order.pickingStatus?.toUpperCase()

  const handleImgError = (id) =>
    setImgErrors(prev => ({ ...prev, [id]: true }))

  return (
    <>
      <section className="order-card">

        {/* Header */}
        <div className="order-card-header">
          <div>
            <p className="order-card-id">#{order.displayIdentifier}</p>
            <p className="order-card-buyer">
              {order.buyerNickname || 'Comprador desconocido'}
            </p>
          </div>
          <span className={`order-card-badge ${badgeCls}`}>
            {badgeLabel}
          </span>
        </div>

        <div className="order-card-divider" />

        {/* Items */}
        <div className="order-card-items">
          {order.orderItems?.map((item) => (
            <div key={item.id} className="order-item-row">

              {/* Imagen clickeable */}
              <div className="order-item-img-wrap">
                {item.thumbnail && !imgErrors[item.id] ? (
                  <button
                    className="order-item-img-btn"
                    onClick={() => setLightboxItem(item)}
                    title="Ver imagen"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="order-item-img"
                      onError={() => handleImgError(item.id)}
                    />
                    <div className="order-item-img-zoom">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
                      </svg>
                    </div>
                  </button>
                ) : (
                  <ImagePlaceholder />
                )}
                <span className="order-item-qty">×{item.quantity}</span>
              </div>

              {/* Info */}
              <div className="order-item-info">
                <p className="order-item-title">{item.title}</p>
                {item.variation && (
                  <span className="order-item-variation">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                    </svg>
                    {item.variation}
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>

        {/* Acción */}
        <div className="order-card-action">
          {packed ? (
            <div className="order-packed-msg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Orden empacada correctamente
            </div>
          ) : (
            <button
              className="order-pack-btn"
              onClick={onPack}
              disabled={order.pickingStatus === 'packed'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              MARCAR COMO EMPACADO
            </button>
          )}
        </div>

      </section>

      <Lightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
    </>
  )
}

export default OrderCard