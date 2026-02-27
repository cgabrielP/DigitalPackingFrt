import OrderRow from './OrderRow'

const OrderTable = ({ orders }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="orders-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
          <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04"/>
        </svg>
        <p>SIN ÓRDENES</p>
      </div>
    )
  }

  return (
    <div className="orders-table-scroll">
      <table className="orders-table">
        <thead>
          <tr>
            <th>ID ORDEN</th>
            <th>COMPRADOR</th>
            <th>TOTAL</th>
            <th>PRODUCTOS</th>
            <th>ESTADO ML</th>
            <th>PICKING</th>
            <th>FECHA</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, i) => (
            <OrderRow key={order.id} order={order} index={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default OrderTable