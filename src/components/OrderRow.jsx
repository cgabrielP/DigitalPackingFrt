import { useState } from "react";
import "./OrderRow.css";

const API_URL = import.meta.env.VITE_API_URL ?? "";

const openLabel = (order) => {
  const token = localStorage.getItem("app_token");
  const id = order.displayIdentifier ?? order.id;
  window.open(`${API_URL}/orders/${id}/label?token=${token}`, "_blank");
};
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

const URGENCY_CONFIG = {
  overdue: { label: "ATRASADA", cls: "urg-overdue", icon: "⚠" },
  today: { label: "HOY", cls: "urg-today", icon: "🕐" },
  upcoming: { label: "PRÓX. DÍAS", cls: "urg-upcoming", icon: "📅" },
  none: { label: "SIN PROMESA", cls: "urg-none", icon: "—" },
};

// Razones por las que una orden puede no tener delivery_promise
const NO_PROMISE_REASONS = {
  me1: "Envío gestionado por el vendedor (ME1) — ML no genera promesa automática.",
  agency:
    "Entrega en sucursal — el comprador retira, no aplica promesa de despacho.",
  default:
    "ML aún no asignó una promesa. Puede ocurrir en órdenes muy recientes o sin método de envío confirmado.",
};

const resolveNoPromiseReason = (order) => {
  if (order.logisticType === "me1" || order.logisticType === "custom")
    return NO_PROMISE_REASONS.me1;
  if (order.shippingDeliverTo === "agency") return NO_PROMISE_REASONS.agency;
  return NO_PROMISE_REASONS.default;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCutoffTime = (isoString) => {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d)) return null;
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
};

// ── Tooltip flotante ──────────────────────────────────────────────────────────
const Tooltip = ({ text, children }) => {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="urgency-tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <span className="urgency-tooltip">{text}</span>}
    </span>
  );
};

// ── Badge de urgencia ─────────────────────────────────────────────────────────
export const UrgencyBadge = ({ order }) => {
  const urgency = order.deliveryUrgency ?? "none";
  const cfg = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.none;
  const cutoff = formatCutoffTime(order.deliveryPromise);

  if (urgency === "none") {
    return (
      <Tooltip text={resolveNoPromiseReason(order)}>
        <span className={`urgency-badge ${cfg.cls}`}>
          <span className="urgency-badge__icon">{cfg.icon}</span>
          {cfg.label}
          <span className="urgency-badge__help">?</span>
        </span>
      </Tooltip>
    );
  }

  return (
    <span className={`urgency-badge ${cfg.cls}`}>
      <span className="urgency-badge__icon">{cfg.icon}</span>
      {cfg.label}
      {cutoff && urgency !== "upcoming" && (
        <span className="urgency-badge__cutoff">· {cutoff}</span>
      )}
    </span>
  );
};

// ── Row ───────────────────────────────────────────────────────────────────────
const OrderRow = ({ order, index, showUrgency = false }) => {
  const mlStatus = STATUS_ML[order.status] || {
    label: order.status?.toUpperCase() || "—",
    cls: "other",
  };
  const pickStatus = STATUS_PICKING[order.pickingStatus] || {
    label: order.pickingStatus,
    cls: "pending",
  };
  const shipCat = SHIPPING_CATEGORY[order.shippingCategory];
  const canPrintLabel =
    order.shippingId &&
    !['shipped', 'delivered', 'not_delivered'].includes(order.shippingStatus) &&
    order.shippingSubstatus !== 'ready_to_print';

  return (
    <tr className="order-row" style={{ animationDelay: `${index * 40}ms` }}>
      <td className="td-id">#{order.displayIdentifier}</td>

      <td className="td-amount">
        ${order.totalAmount?.toLocaleString("es-CL")}
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
        ) : (
          "—"
        )}
      </td>

      {/* Urgencia — solo cuando showUrgency=true */}
      {showUrgency && (
        <td className="td-urgency">
          <UrgencyBadge order={order} />
        </td>
      )}

      {/* Estado picking */}
      <td>
        <span className={`picking-badge ${pickStatus.cls}`}>
          <span className="badge-dot" />
          {pickStatus.label}
        </span>
      </td>

      <td className="td-date">{formatDate(order.lastUpdatedAt)}</td>
      <td>
        {canPrintLabel && (
          <button
            className="label-btn"
            onClick={() => openLabel(order)}
            title="Imprimir etiqueta"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2">
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            ETIQUETA
          </button>
        )}
      </td>
    </tr>
  );
};

export default OrderRow;
