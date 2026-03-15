import { useState } from "react";
import OrderRow from "./OrderRow";
import { UrgencyBadge } from "./OrderRow";
import "./OrderTable.css";

const STATUS_ML = {
  paid: { label: "PAGADO", cls: "paid" },
  confirmed: { label: "CONFIRMADO", cls: "confirmed" },
  cancelled: { label: "CANCELADO", cls: "cancelled" },
};

const STATUS_PICKING = {
  pending: { label: "PENDIENTE", cls: "pending" },
  scanned: { label: "ESCANEADO", cls: "scanned" },
  packed: { label: "EMPACADO", cls: "packed" },
};

const SHIPPING_CATEGORY = {
  por_despachar: { label: "POR DESPACHAR", cls: "ship-pending" },
  en_transito: { label: "EN TRÁNSITO", cls: "ship-transit" },
  finalizados: { label: "FINALIZADO", cls: "ship-done" },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ─── Mobile accordion card ───────────────────────────────────────────────────
const OrderCard = ({ order, index, showUrgency = false }) => {
  const [open, setOpen] = useState(false);

  const mlStatus = STATUS_ML[order.status] || {
    label: order.status?.toUpperCase() || "—",
    cls: "other",
  };
  const pickStatus = STATUS_PICKING[order.pickingStatus] || {
    label: order.pickingStatus ?? "—",
    cls: "pending",
  };
  const shipCat = SHIPPING_CATEGORY[order.shippingCategory];

  return (
    <div
      className={`ocard${open ? " ocard--open" : ""}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* ── Always-visible summary row ─────────────────────────────────── */}
      <button
        className="ocard__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="ocard__id">#{order.displayIdentifier}</span>
        <span className="ocard__buyer">{order.buyerNickname || "—"}</span>
        <span className="ocard__total">
          ${order.totalAmount?.toLocaleString("es-CL")}
        </span>
        {/* En mobile mostramos el badge de urgencia en el header si aplica */}
        {showUrgency ? (
          <UrgencyBadge order={order} />
        ) : (
          <span className={`status-badge ${mlStatus.cls}`}>
            <span className="badge-dot" />
            {mlStatus.label}
          </span>
        )}
        <span className="ocard__chevron" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* ── Expandable detail panel ────────────────────────────────────── */}
      <div className="ocard__body">
        <div className="ocard__body-inner">
          {/* Thumbnails */}
          {order.orderItems?.length > 0 && (
            <div className="ocard__thumbs">
              {order.orderItems.slice(0, 4).map((item) =>
                item.thumbnail ? (
                  <img
                    key={item.id}
                    src={item.thumbnail}
                    alt={item.title}
                    className="item-thumb"
                    title={item.title}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    key={item.id}
                    className="item-thumb-placeholder"
                    title={item.title}
                  >
                    📦
                  </div>
                )
              )}
              {order.orderItems.length > 4 && (
                <div className="item-thumb-placeholder">
                  +{order.orderItems.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Detail grid */}
          <dl className="ocard__grid">
            {/* Si no es vista urgency, mostrar estado ML */}
            {!showUrgency && (
              <div className="ocard__field">
                <dt>ESTADO ML</dt>
                <dd>
                  <span className={`status-badge ${mlStatus.cls}`}>
                    <span className="badge-dot" />
                    {mlStatus.label}
                  </span>
                </dd>
              </div>
            )}

            <div className="ocard__field">
              <dt>PICKING</dt>
              <dd>
                <span className={`picking-badge ${pickStatus.cls}`}>
                  <span className="badge-dot" />
                  {pickStatus.label}
                </span>
              </dd>
            </div>

            <div className="ocard__field">
              <dt>ENVÍO</dt>
              <dd>
                {shipCat ? (
                  <span className={`status-badge ${shipCat.cls}`}>
                    <span className="badge-dot" />
                    {shipCat.label}
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>

            {/* Urgencia expandida en el detalle del card */}
            {showUrgency && (
              <div className="ocard__field ocard__field--full">
                <dt>URGENCIA</dt>
                <dd>
                  <UrgencyBadge order={order} />
                </dd>
              </div>
            )}

            {/* Método de envío si existe */}
            {order.shippingOptionName && (
              <div className="ocard__field ocard__field--full">
                <dt>MÉTODO</dt>
                <dd className="ocard__method">{order.shippingOptionName}</dd>
              </div>
            )}

            {/* Destino si existe */}
            {order.receiverCity && (
              <div className="ocard__field">
                <dt>DESTINO</dt>
                <dd>{order.receiverCity}</dd>
              </div>
            )}

            <div className="ocard__field ocard__field--full">
              <dt>FECHA</dt>
              <dd>{formatDate(order.createdAt)}</dd>
            </div>
          </dl>

          {/* Etiqueta — mobile */}
          {order.shippingId &&!['shipped', 'delivered', 'not_delivered'].includes(order.shippingStatus) && (
            <div className="ocard__label-action">
              <button
                className="label-btn label-btn--full"
                onClick={() => {
                  const token = localStorage.getItem("app_token");
                  const id = order.displayIdentifier ?? order.id;
                  const url = `${
                    import.meta.env.VITE_API_URL ?? ""
                  }/orders/${id}/label?token=${token}`;
                  window.open(url, "_blank");
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M6 9V2h12v7" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                IMPRIMIR ETIQUETA
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const OrderTable = ({ orders, showUrgency = false }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="orders-empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        >
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04" />
        </svg>
        <p>SIN ÓRDENES</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="orders-table-scroll orders-table-scroll--desktop">
        <table className="orders-table">
          <thead>
            <tr>
              <th>ID ORDEN</th>
              <th>TOTAL</th>
              <th>PRODUCTOS</th>
              <th>ESTADO ML</th>
              <th>ENVÍO</th>
              {/* Columna urgencia — aparece dinámicamente */}
              {showUrgency && <th className="th-urgency">URGENCIA</th>}
              <th>PICKING</th>
              <th>FECHA</th>
              <th>ETIQUETA</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => (
              <OrderRow
                key={order.id}
                order={order}
                index={i}
                showUrgency={showUrgency}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile accordion */}
      <div className="orders-cards orders-cards--mobile">
        {orders.map((order, i) => (
          <OrderCard
            key={order.id}
            order={order}
            index={i}
            showUrgency={showUrgency}
          />
        ))}
      </div>
    </>
  );
};

export default OrderTable;
