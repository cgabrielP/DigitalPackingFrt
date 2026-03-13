import './DeliveryAssignmentRow.css'

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SHIPPING_STATUS = {
  delivered:     { label: 'ENTREGADO',  cls: 'delivered' },
  shipped:       { label: 'EN CAMINO',  cls: 'shipped'   },
  not_delivered: { label: 'NO ENTREGADO', cls: 'failed'  },
}

export default function DeliveryAssignmentRow({ assignment, index, onUnassign, canManage }) {
  const { order, deliveryUser, assignedAt, paymentAmount, notes } = assignment
const shipStatus = (order.status === 'cancelled') 
  ? SHIPPING_STATUS.not_delivered 
  : (SHIPPING_STATUS[order.shippingStatus] ?? { label: order.shippingStatus?.toUpperCase() ?? '—', cls: 'other' });  const isDelivered = order.shippingStatus === 'delivered'

  return (
    
    <tr className="dar-row" style={{ animationDelay: `${index * 35}ms` }}>

      <td className="dar-id">
        #{order.packId ?? order.id}
      </td>

      <td className="dar-buyer">{order.buyerNickname ?? '—'}</td>

      <td>
        <div className="dar-items">
          {order.orderItems?.slice(0, 3).map(item =>
            item.thumbnail
              ? <img key={item.id} src={item.thumbnail} alt={item.title} className="dar-thumb" title={item.title} onError={e => { e.target.style.display = 'none' }} />
              : <div key={item.id} className="dar-thumb-placeholder" title={item.title}>📦</div>
          )}
          {order.orderItems?.length > 3 && (
            <div className="dar-thumb-placeholder">+{order.orderItems.length - 3}</div>
          )}
        </div>
      </td>

      <td>
        <span className={`dar-badge dar-badge--${shipStatus.cls}`}>
          <span className="dar-dot" />
          {shipStatus.label}
        </span>
      </td>

      <td className="dar-city">{order.receiverCity ?? '—'}</td>

      {canManage && (
        <td className="dar-delivery">
          <div className="dar-user-cell">
            <span className="dar-avatar">
              {deliveryUser?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <span>{deliveryUser?.name ?? '—'}</span>
          </div>
        </td>
      )}

      <td className="dar-date">{formatDate(assignedAt)}</td>

      <td className="dar-payment">
        <span className={isDelivered ? 'dar-amount dar-amount--paid' : 'dar-amount'}>
          ${paymentAmount?.toLocaleString('es-CL')}
        </span>
      </td>

      {notes && (
        <td className="dar-notes" title={notes}>
          <span className="dar-notes-text">{notes}</span>
        </td>
      )}
      {!notes && <td />}

      {canManage && (
        <td>
          <button
            className="dar-btn-unassign"
            onClick={() => onUnassign(order.id, order.packId ?? order.id)}
            title="Quitar asignación"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  )
}