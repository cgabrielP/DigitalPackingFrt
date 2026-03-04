import './OrderRow.css'

const STATUS_ML = {
  paid:      { label: 'PAGADO',     cls: 'paid'      },
  confirmed: { label: 'CONFIRMADO', cls: 'confirmed' },
  cancelled: { label: 'CANCELADO',  cls: 'cancelled' },
}

const STATUS_PICKING = {
  pending: { label: 'PENDIENTE', cls: 'pending' },
  scanned: { label: 'ESCANEADO', cls: 'scanned' },
  packed:  { label: 'EMPACADO',  cls: 'packed'  },
}

const SHIPPING_CATEGORY = {
  por_despachar: { label: 'POR DESPACHAR', cls: 'ship-pending' },
  en_transito:   { label: 'EN TRÁNSITO',   cls: 'ship-transit' },
  finalizados:   { label: 'FINALIZADO',    cls: 'ship-done'    },
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

const OrderRow = ({ order, index }) => {
  const mlStatus   = STATUS_ML[order.status]            || { label: order.status?.toUpperCase() || '—', cls: 'other' }
  const pickStatus = STATUS_PICKING[order.pickingStatus] || { label: order.pickingStatus, cls: 'pending' }
  const shipCat    = SHIPPING_CATEGORY[order.shippingCategory]

  return (
    <tr className="order-row" style={{ animationDelay: `${index * 40}ms` }}>

      <td className="td-id">#{order.displayIdentifier}</td>

      <td className="td-buyer">{order.buyerNickname || '—'}</td>

      <td className="td-amount">
        ${order.totalAmount?.toLocaleString('es-CL')}
      </td>

      {/* Items thumbnails */}
      <td>
        <div className="td-items">
          {order.orderItems?.slice(0, 3).map((item) =>
            item.thumbnail ? (
              <img
                key={item.id}
                src={item.thumbnail}
                alt={item.title}
                className="item-thumb"
                title={item.title}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <div key={item.id} className="item-thumb-placeholder" title={item.title}>
                📦
              </div>
            )
          )}
          {order.orderItems?.length > 3 && (
            <div className="item-thumb-placeholder">
              +{order.orderItems.length - 3}
            </div>
          )}
        </div>
      </td>

      {/* Estado ML */}
      <td>
        <span className={`status-badge ${mlStatus.cls}`}>
          <span className="badge-dot" />
          {mlStatus.label}
        </span>
      </td>

      {/* Categoría de envío */}
      <td>
        {shipCat ? (
          <span className={`status-badge ${shipCat.cls}`}>
            <span className="badge-dot" />
            {shipCat.label}
          </span>
        ) : '—'}
      </td>

      {/* Estado picking */}
      <td>
        <span className={`picking-badge ${pickStatus.cls}`}>
          <span className="badge-dot" />
          {pickStatus.label}
        </span>
      </td>

      <td className="td-date">{formatDate(order.lastUpdatedAt)}</td>
    </tr>
  )
}

export default OrderRow