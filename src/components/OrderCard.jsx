import './OrderCard.css'

const BADGE_CLS = {
  pending:  'pending',
  scanned:  'scanned',
  packed:   'packed',
}

const BADGE_LABEL = {
  pending: 'PENDIENTE',
  scanned: 'ESCANEADO',
  packed:  'EMPACADO',
}

const OrderCard = ({ order, packed, onPack }) => {
  const badgeCls   = BADGE_CLS[order.pickingStatus]   || 'pending'
  const badgeLabel = BADGE_LABEL[order.pickingStatus] || order.pickingStatus?.toUpperCase()

  return (
    <section className="order-card">

      {/* Header */}
      <div className="order-card-header">
        <div>
          <p className="order-card-id">#{order.id}</p>
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

            {/* Imagen */}
            <div className="order-item-img-wrap">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="order-item-img"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling?.style && (e.target.nextSibling.style.display = 'flex')
                  }}
                />
              ) : (
                <div className="order-item-img-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
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
  )
}

export default OrderCard