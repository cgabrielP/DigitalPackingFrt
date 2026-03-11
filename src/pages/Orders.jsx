import { useEffect, useState, useMemo, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import OrderTable from "../components/OrderTable";
import "./Orders.css";
import Layout from "../components/Layout";

const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

const STATUS_FILTERS = [
  { key: "all",     label: "TODAS",     color: null      },
  { key: "pending", label: "PENDIENTE", color: "#f59e0b" },
  { key: "scanned", label: "ESCANEADO", color: "#3b82f6" },
  { key: "packed",  label: "EMPACADO",  color: "#16a34a" },
];

const SHIPPING_FILTERS = [
  { key: "all",           label: "TODAS",         color: null      },
  { key: "por_despachar", label: "POR DESPACHAR", color: "#f59e0b" },
  { key: "en_transito",   label: "EN TRÁNSITO",   color: "#3b82f6" },
];

// Urgencia — solo aplica cuando shippingFilter === "por_despachar"
const URGENCY_FILTERS = [
  { key: "all",      label: "TODAS",          color: null      },
  { key: "overdue",  label: "ATRASADAS",      color: "#ef4444" },
  { key: "today",    label: "HOY",            color: "#f97316" },
  { key: "upcoming", label: "PRÓXIMOS DÍAS",  color: "#8b5cf6" },
  { key: "none",     label: "SIN PROMESA",    color: "#6b7280" },
];

// Peso para ordenar por urgencia: menor número = más urgente
const URGENCY_ORDER = { overdue: 0, today: 1, upcoming: 2, none: 3 };

const formatShort = (date) => {
  if (!date) return "";
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
};

const formatDeliveryPromise = (isoString) => {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d)) return null;
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
};

/* ── Helpers de estado ── */
export const isCancelled = (o) =>
  o.status === "cancelled" ||
  o.shippingStatus === "cancelled" ||
  o.shippingSubstatus === "cancelled";

export const isFinished = (o) =>
  o.shippingCategory === "finalizados" ||
  o.shippingStatus === "delivered" ||
  o.shippingSubstatus === "delivered";

export default function Orders() {
  const [orders, setOrders]                   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [syncing, setSyncing]                 = useState(false);
  const [statusFilter, setStatusFilter]       = useState("all");
  const [shippingFilter, setShippingFilter]   = useState("all");
  const [urgencyFilter, setUrgencyFilter]     = useState("all");
  const [search, setSearch]                   = useState("");
  const [toast, setToast]                     = useState(null);
  const [dateRange, setDateRange]             = useState([null, null]);
  const [calendarOpen, setCalendarOpen]       = useState(false);
  const [startDate, endDate] = dateRange;

  const calendarRef = useRef(null);
  const btnRef      = useRef(null);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("picking_theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("picking_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Resetear urgency filter cuando se cambia el filtro de envío
  const handleShippingFilter = (key) => {
    setShippingFilter(key);
    setUrgencyFilter("all");
  };

  useEffect(() => {
    if (!calendarOpen) return;
    const handler = (e) => {
      if (
        calendarRef.current && !calendarRef.current.contains(e.target) &&
        btnRef.current      && !btnRef.current.contains(e.target)
      ) setCalendarOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [calendarOpen]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/orders`, { headers: getHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setOrders(data);
      // DEBUG — pegalo justo después del setOrders(data) en loadOrders
console.table(
  data
    .filter(o => o.shippingCategory === "por_despachar" && o.deliveryPromise)
    .map(o => ({
      id:             o.displayIdentifier,
      deliveryUrgency: o.deliveryUrgency,          // lo que mandó el backend
      deliveryPromise: o.deliveryPromise,           // string raw
      promiseParsed:   new Date(o.deliveryPromise).toISOString(),  // cómo lo parsea el browser
      browserNow:      new Date().toISOString(),    // ahora en el browser
      diffMinutes:     Math.round(
        (new Date(o.deliveryPromise) - new Date()) / 60000
      ),                                            // positivo = no vencido, negativo = vencido
    }))
);
    } catch {
      showToast("Error cargando órdenes", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`${API_URL}/orders/sync`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      showToast("✓ Órdenes sincronizadas");
      await loadOrders();
    } catch {
      showToast("Error al sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  /* ── Solo activas ── */
  const activeOrders = useMemo(
    () => orders.filter((o) => !isCancelled(o) && !isFinished(o)),
    [orders]
  );

  const stats = useMemo(() => ({
    total:   activeOrders.length,
    pending: activeOrders.filter((o) => o.pickingStatus === "pending").length,
    scanned: activeOrders.filter((o) => o.pickingStatus === "scanned").length,
    packed:  activeOrders.filter((o) => o.pickingStatus === "packed").length,
  }), [activeOrders]);

  const shippingCounts = useMemo(() => {
    const counts = { all: activeOrders.length };
    SHIPPING_FILTERS.forEach((f) => {
      if (f.key !== "all")
        counts[f.key] = activeOrders.filter((o) => o.shippingCategory === f.key).length;
    });
    return counts;
  }, [activeOrders]);

  // Conteos de urgencia — solo sobre las "por_despachar"
  const urgencyCounts = useMemo(() => {
    const porDespachar = activeOrders.filter((o) => o.shippingCategory === "por_despachar");
    const counts = { all: porDespachar.length };
    URGENCY_FILTERS.forEach((f) => {
      if (f.key !== "all")
        counts[f.key] = porDespachar.filter((o) => o.deliveryUrgency === f.key).length;
    });
    return counts;
  }, [activeOrders]);

  const toDateOnly = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const filtered = useMemo(() => {
    const isPorDespachar = shippingFilter === "por_despachar";

    return activeOrders
      .filter((o) => {
        const matchStatus   = statusFilter   === "all" || o.pickingStatus    === statusFilter;
        const matchShipping = shippingFilter === "all" || o.shippingCategory === shippingFilter;

        // Filtro de urgencia — solo activo en "por_despachar"
        const matchUrgency  = !isPorDespachar || urgencyFilter === "all" || o.deliveryUrgency === urgencyFilter;

        const matchSearch   =
          !search ||
          o.id?.toString().includes(search) ||
          o.displayIdentifier?.toString().includes(search) ||
          o.buyerNickname?.toLowerCase().includes(search.toLowerCase());

        let matchDate = true;
        if (startDate || endDate) {
          const raw = o.lastUpdatedAt ?? o.createdAt;
          const orderDate = toDateOnly(raw);
          if (!orderDate) {
            matchDate = false;
          } else {
            if (startDate && orderDate < toDateOnly(startDate)) matchDate = false;
            if (endDate && matchDate && orderDate > toDateOnly(endDate)) matchDate = false;
          }
        }

        return matchStatus && matchShipping && matchUrgency && matchSearch && matchDate;
      })
      .sort((a, b) => {
        // En "por_despachar" ordenar por urgencia primero, luego por deliveryPromise
        if (isPorDespachar) {
          const urgA = URGENCY_ORDER[a.deliveryUrgency ?? "none"] ?? 3;
          const urgB = URGENCY_ORDER[b.deliveryUrgency ?? "none"] ?? 3;
          if (urgA !== urgB) return urgA - urgB;

          // Dentro del mismo nivel de urgencia, ordenar por hora de corte (más próxima primero)
          const promA = a.deliveryPromise ? new Date(a.deliveryPromise).getTime() : Infinity;
          const promB = b.deliveryPromise ? new Date(b.deliveryPromise).getTime() : Infinity;
          return promA - promB;
        }

        // Default: más reciente primero
        return (
          new Date(b.lastUpdatedAt ?? b.createdAt ?? 0) -
          new Date(a.lastUpdatedAt ?? a.createdAt ?? 0)
        );
      });
  }, [activeOrders, statusFilter, shippingFilter, urgencyFilter, search, startDate, endDate]);

  const dateLabel = useMemo(() => {
    if (!startDate && !endDate) return "FECHA";
    if (startDate && !endDate)  return formatShort(startDate);
    return `${formatShort(startDate)} → ${formatShort(endDate)}`;
  }, [startDate, endDate]);

  const hasActiveFilters =
    statusFilter !== "all" || shippingFilter !== "all" ||
    urgencyFilter !== "all" || search || startDate || endDate;

  const clearAll = () => {
    setStatusFilter("all");
    setShippingFilter("all");
    setUrgencyFilter("all");
    setSearch("");
    setDateRange([null, null]);
  };

  const isPorDespachar = shippingFilter === "por_despachar";

  return (
    <div className="orders-root">
      <Layout subtitle="ORDERS" theme={theme} onToggleTheme={toggleTheme} onSync={handleSync} syncing={syncing}>
        <main className="orders-main">

          <div className="orders-page-title">
            <h1>ÓRDENES</h1>
            <p>{activeOrders.length} órdenes activas · Mercado Libre</p>
          </div>

          <div className="orders-stats">
            <div className="orders-stat-card">
              <span className="orders-stat-label">TOTAL</span>
              <span className="orders-stat-value">{stats.total}</span>
            </div>
            <div className="orders-stat-card">
              <span className="orders-stat-label">PENDIENTES</span>
              <span className="orders-stat-value yellow">{stats.pending}</span>
            </div>
            <div className="orders-stat-card">
              <span className="orders-stat-label">ESCANEADAS</span>
              <span className="orders-stat-value blue">{stats.scanned}</span>
            </div>
            <div className="orders-stat-card">
              <span className="orders-stat-label">EMPACADAS</span>
              <span className="orders-stat-value green">{stats.packed}</span>
            </div>
          </div>

          {/* Banner de urgencia — solo visible cuando hay pedidos atrasados u "hoy" */}
          {(urgencyCounts.overdue > 0 || urgencyCounts.today > 0) && (
            <div className="orders-urgency-banner">
              {urgencyCounts.overdue > 0 && (
                <button
                  className={`urgency-banner-chip overdue ${isPorDespachar && urgencyFilter === "overdue" ? "active" : ""}`}
                  onClick={() => { handleShippingFilter("por_despachar"); setUrgencyFilter("overdue"); }}
                >
                  <span className="urgency-dot" />
                  {urgencyCounts.overdue} atrasada{urgencyCounts.overdue !== 1 ? "s" : ""}
                </button>
              )}
              {urgencyCounts.today > 0 && (
                <button
                  className={`urgency-banner-chip today ${isPorDespachar && urgencyFilter === "today" ? "active" : ""}`}
                  onClick={() => { handleShippingFilter("por_despachar"); setUrgencyFilter("today"); }}
                >
                  <span className="urgency-dot" />
                  {urgencyCounts.today} para despachar hoy
                </button>
              )}
              {urgencyCounts.upcoming > 0 && (
                <button
                  className={`urgency-banner-chip upcoming ${isPorDespachar && urgencyFilter === "upcoming" ? "active" : ""}`}
                  onClick={() => { handleShippingFilter("por_despachar"); setUrgencyFilter("upcoming"); }}
                >
                  <span className="urgency-dot" />
                  {urgencyCounts.upcoming} próximos días
                </button>
              )}
            </div>
          )}

          <div className="orders-toolbar">
            <div className="orders-search-wrapper">
              <svg className="orders-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="orders-search" type="text"
                placeholder="Buscar por ID o comprador..."
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
              {search && <button className="orders-search-clear" onClick={() => setSearch("")}>×</button>}
            </div>

            <div className="orders-filter-group">
              <span className="filter-group-label">ESTADO</span>
              <div className="orders-filters-scroll">
                {STATUS_FILTERS.map((f) => (
                  <button key={f.key}
                    className={`orders-filter-btn ${statusFilter === f.key ? `active-${f.key}` : ""}`}
                    onClick={() => setStatusFilter(f.key)}
                  >
                    {f.color && <span className="filter-dot" style={{ background: f.color }}/>}
                    {f.label}
                    {f.key !== "all" && <span className="filter-count">({stats[f.key]})</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="orders-filter-group">
              <span className="filter-group-label">ENVÍO</span>
              <div className="orders-filters-scroll">
                {SHIPPING_FILTERS.map((f) => (
                  <button key={f.key}
                    className={`orders-filter-btn shipping ${shippingFilter === f.key ? "active-shipping" : ""}`}
                    onClick={() => handleShippingFilter(f.key)}
                  >
                    {f.color && <span className="filter-dot" style={{ background: f.color }}/>}
                    {f.label}
                    <span className="filter-count">({shippingCounts[f.key] ?? 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro de urgencia — solo visible en "por_despachar" */}
            {isPorDespachar && (
              <div className="orders-filter-group urgency-group">
                <span className="filter-group-label">URGENCIA</span>
                <div className="orders-filters-scroll">
                  {URGENCY_FILTERS.map((f) => (
                    <button key={f.key}
                      className={`orders-filter-btn urgency ${urgencyFilter === f.key ? `active-urgency-${f.key}` : ""}`}
                      onClick={() => setUrgencyFilter(f.key)}
                    >
                      {f.color && <span className="filter-dot" style={{ background: f.color }}/>}
                      {f.label}
                      <span className="filter-count">({urgencyCounts[f.key] ?? 0})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="orders-filter-group">
              <span className="filter-group-label">FECHA</span>
              <div className="orders-date-wrapper">
                <button ref={btnRef}
                  className={`orders-filter-btn ${startDate || endDate ? "active-date" : ""}`}
                  onClick={() => setCalendarOpen((v) => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  {dateLabel}
                  {(startDate || endDate) && (
                    <span className="date-clear-x" onClick={(e) => { e.stopPropagation(); setDateRange([null, null]); }}>×</span>
                  )}
                </button>
                {calendarOpen && (
                  <div ref={calendarRef} className="orders-calendar-popup">
                    <DatePicker
                      selected={startDate}
                      onChange={(update) => { setDateRange(update); if (update[0] && update[1]) setCalendarOpen(false); }}
                      startDate={startDate} endDate={endDate}
                      selectsRange inline maxDate={new Date()}
                    />
                    <div className="cal-footer">
                      <button className="cal-btn-clear" onClick={() => { setDateRange([null, null]); setCalendarOpen(false); }}>Limpiar</button>
                      <button className="cal-btn-close" onClick={() => setCalendarOpen(false)}>Cerrar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="orders-active-filters">
              <span className="active-filters-info">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                {(startDate || endDate) && <span style={{ color: "#8b5cf6", marginLeft: 6 }}>· {dateLabel}</span>}
                {isPorDespachar && urgencyFilter !== "all" && (
                  <span style={{ color: URGENCY_FILTERS.find(f => f.key === urgencyFilter)?.color, marginLeft: 6 }}>
                    · {URGENCY_FILTERS.find(f => f.key === urgencyFilter)?.label}
                  </span>
                )}
              </span>
              <button className="active-filters-clear" onClick={clearAll}>Limpiar filtros</button>
            </div>
          )}

          <div className="orders-table-wrapper">
            {loading ? (
              <div className="orders-empty"><span className="spinner-large"/><p>CARGANDO</p></div>
            ) : filtered.length === 0 ? (
              <div className="orders-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <p>SIN RESULTADOS</p>
              </div>
            ) : (
              <OrderTable orders={filtered} showUrgency={isPorDespachar} />
            )}
          </div>

        </main>
      </Layout>
      {toast && <div className={`orders-toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}