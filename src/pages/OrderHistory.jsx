import { useEffect, useState, useMemo, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import OrderTable from "../components/OrderTable";
import "./Orders.css";
import Layout from "../components/Layout";
import { isCancelled, isFinished } from "./Orders";
import { apiFetch } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

const HISTORY_FILTERS = [
  { key: "all",       label: "TODAS",      color: null      },
  { key: "cancelled", label: "CANCELADAS", color: "#f87171" },
  { key: "finished",  label: "FINALIZADAS", color: "#16a34a" },
];

const formatShort = (date) => {
  if (!date) return "";
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
};

export default function OrderHistory() {
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [toast, setToast]               = useState(null);
  const [dateRange, setDateRange]       = useState([null, null]);
  const [calendarOpen, setCalendarOpen] = useState(false);
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
      const res = await apiFetch(`${API_URL}/orders`, { headers: getHeaders() });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      setOrders(data);
    } catch {
      showToast("Error cargando historial", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  /* ── Solo canceladas y finalizadas ── */
  const historialOrders = useMemo(
    () => orders.filter((o) => isCancelled(o) || isFinished(o)),
    [orders]
  );

  const counts = useMemo(() => ({
    all:       historialOrders.length,
    cancelled: historialOrders.filter(isCancelled).length,
    finished:  historialOrders.filter(isFinished).length,
  }), [historialOrders]);

  const toDateOnly = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const filtered = useMemo(() => {
    return historialOrders
      .filter((o) => {
        if (historyFilter === "cancelled" && !isCancelled(o)) return false;
        if (historyFilter === "finished"  && !isFinished(o))  return false;

        const matchSearch =
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

        return matchSearch && matchDate;
      })
      .sort((a, b) =>
        new Date(b.lastUpdatedAt ?? b.createdAt ?? 0) -
        new Date(a.lastUpdatedAt ?? a.createdAt ?? 0)
      );
  }, [historialOrders, historyFilter, search, startDate, endDate]);

  const dateLabel = useMemo(() => {
    if (!startDate && !endDate) return "FECHA";
    if (startDate && !endDate)  return formatShort(startDate);
    return `${formatShort(startDate)} → ${formatShort(endDate)}`;
  }, [startDate, endDate]);

  const hasActiveFilters = historyFilter !== "all" || search || startDate || endDate;

  const clearAll = () => {
    setHistoryFilter("all");
    setSearch("");
    setDateRange([null, null]);
  };

  return (
    <div className="orders-root">
      <Layout subtitle="HISTORIAL" theme={theme} onToggleTheme={toggleTheme}>
        <main className="orders-main">

          <div className="orders-page-title">
            <h1>HISTORIAL</h1>
            <p>{historialOrders.length} órdenes · canceladas y finalizadas · Mercado Libre</p>
          </div>

          {/* ── Stats ── */}
          <div className="orders-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="orders-stat-card">
              <span className="orders-stat-label">TOTAL</span>
              <span className="orders-stat-value">{counts.all}</span>
            </div>
            <div className="orders-stat-card">
              <span className="orders-stat-label">CANCELADAS</span>
              <span className="orders-stat-value" style={{ color: "#f87171" }}>{counts.cancelled}</span>
            </div>
            <div className="orders-stat-card">
              <span className="orders-stat-label">FINALIZADAS</span>
              <span className="orders-stat-value green">{counts.finished}</span>
            </div>
          </div>

          {/* ── Toolbar ── */}
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
              <span className="filter-group-label">TIPO</span>
              <div className="orders-filters-scroll">
                {HISTORY_FILTERS.map((f) => (
                  <button key={f.key}
                    className={`orders-filter-btn ${historyFilter === f.key ? `active-history-${f.key}` : ""}`}
                    onClick={() => setHistoryFilter(f.key)}
                  >
                    {f.color && <span className="filter-dot" style={{ background: f.color }}/>}
                    {f.label}
                    <span className="filter-count">({counts[f.key] ?? 0})</span>
                  </button>
                ))}
              </div>
            </div>

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
              <OrderTable orders={filtered}/>
            )}
          </div>

        </main>
      </Layout>
      {toast && <div className={`orders-toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}