import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Layout from "../components/Layout";
import DeliveryAssignmentRow from "../components/DeliveryAssignmentRow";
import CameraScanner from "../components/CameraScanner";
import "./AssignDelivery.css";
import ReportModal from "../components/ReportModal";
import ManualOrderModal from "../components/ManualOrderModal";
import { generateDeliveryReport } from "../utils/reports.js";
import { apiFetch } from "../utils/auth.js";

const API_URL = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

const getSession = () => {
  try {
    return JSON.parse(atob(localStorage.getItem("app_token").split(".")[1]));
  } catch {
    return null;
  }
};

const todayISO = () => new Date().toISOString().split("T")[0];
const formatDateLabel = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/* ── Toast ── */
const Toast = ({ toast, onDismiss }) => {
  if (!toast) return null;
  return (
    <div className={`adl-toast adl-toast--${toast.type} ${toast.fading ? "adl-toast--out" : ""}`}>
      <div className="adl-toast-main">
        <span className="adl-toast-icon">{toast.type === "success" ? "✓" : "✗"}</span>
        <span className="adl-toast-msg">{toast.msg}</span>
        <button className="adl-toast-close" onClick={onDismiss}>×</button>
      </div>
      {toast.details && toast.details.length > 0 && (
        <div className="adl-toast-details">
          {toast.details.map((d, i) => (
            <div key={i} className="adl-toast-detail-row">{d}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
export default function AssignDelivery() {
  // ── Datos ──
  const [orders, setOrders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [deliveryUsers, setDeliveryUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState("pending"); // 'pending' | 'assigned'
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("picking_theme") || "light"
  );
  const [reportModal, setReportModal] = useState(false);
  const [manualModal, setManualModal] = useState(false);

  // ── Scanner / búsqueda ──
  const [code, setCode] = useState("");
  const [scanWarning, setScanWarning] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scannerMode, setScannerMode] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);

  // ── Asignación bulk ──
  const [selectedUser, setSelectedUser] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]); // ← lista acumulada
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkDone, setBulkDone] = useState(null); // { assigned: n, errors: [] }
  const deliverySelectRef = useRef(null);
  const [deliverySelectOpen, setDeliverySelectOpen] = useState(false);
  // ── Filtros tab assigned ──
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [cityOpen, setCityOpen] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [startDate, endDate] = dateRange;

  // ── Refs ──
  const inputRef = useRef(null);
  const scannerBuffer = useRef("");
  const scannerTimer = useRef(null);
  const calendarRef = useRef(null);
  const calendarBtn = useRef(null);
  const cityRef = useRef(null);
  const deliveryFilterRef = useRef(null);
  const submitCodeRef = useRef(null);

  const session = getSession();

  /* ── Tema ── */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("picking_theme", theme);
  }, [theme]);

  /* ── Cerrar dropdowns al clickear fuera ── */
  useEffect(() => {
    const handler = (e) => {
      if (
        deliverySelectRef.current &&
        !deliverySelectRef.current.contains(e.target)
      )
        setDeliverySelectOpen(false);
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target) &&
        calendarBtn.current &&
        !calendarBtn.current.contains(e.target)
      )
        setCalendarOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target))
        setCityOpen(false);
      if (
        deliveryFilterRef.current &&
        !deliveryFilterRef.current.contains(e.target)
      )
        setDeliveryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Captura global de teclado para pistola lectora ── */
  useEffect(() => {
    const INTERVAL = 50;
    const onKeyDown = (e) => {
      const active = document.activeElement;
      const isInput = active === inputRef.current;
      if (isInput) return;
      const tag = active?.tagName?.toLowerCase();
      if (["input", "textarea", "select", "button"].includes(tag)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        if (scannerBuffer.current.trim()) {
          const captured = scannerBuffer.current;
          scannerBuffer.current = "";
          clearTimeout(scannerTimer.current);
          setScannerMode(false);
          submitCodeRef.current(captured);
        }
        return;
      }
      if (e.key.length === 1) {
        scannerBuffer.current += e.key;
        setScannerMode(true);
        setCode(scannerBuffer.current);
        clearTimeout(scannerTimer.current);
        scannerTimer.current = setTimeout(() => {
          if (scannerBuffer.current.trim().length >= 4) {
            const captured = scannerBuffer.current;
            scannerBuffer.current = "";
            setScannerMode(false);
            submitCodeRef.current(captured);
          } else {
            inputRef.current?.focus();
            scannerBuffer.current = "";
            setScannerMode(false);
          }
        }, INTERVAL * 3);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(scannerTimer.current);
    };
  }, []);

  /* ── Carga de datos ── */
  useEffect(() => {
    loadAll();
  }, [date]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ordersRes, assignmentsRes, usersRes] = await Promise.all([
        apiFetch(`${API_URL}/orders`, { headers: getHeaders() }),
        apiFetch(`${API_URL}/delivery/assignments?date=${date}`, {
          headers: getHeaders(),
        }),
        apiFetch(`${API_URL}/admin/users`, { headers: getHeaders() }),
      ]);
      const [ordersData, assignmentsData, usersData] = await Promise.all([
        ordersRes.json(),
        assignmentsRes.json(),
        usersRes.json(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setDeliveryUsers(
        (Array.isArray(usersData) ? usersData : []).filter(
          (u) => u.role === "DELIVERY" && u.isActive
        )
      );
    } catch {
      showToast("error", "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  const toastTimer = useRef(null);
  const showToast = (type, msg, details = null) => {
    clearTimeout(toastTimer.current);
    setToast({ type, msg, details, fading: false });
    const duration = details ? 8000 : 3500;
    toastTimer.current = setTimeout(() => {
      setToast((prev) => prev ? { ...prev, fading: true } : null);
      setTimeout(() => setToast(null), 300);
    }, duration);
  };
  const dismissToast = () => {
    clearTimeout(toastTimer.current);
    setToast((prev) => prev ? { ...prev, fading: true } : null);
    setTimeout(() => setToast(null), 300);
  };

  /* ── Navegación de días ── */
  const changeDate = (offset) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split("T")[0]);
  };

  /* ── Memos ── */
  const assignedOrderIds = useMemo(
    () => new Set(assignments.map((a) => a.orderId)),
    [assignments]
  );

  const totalPagarHoy = useMemo(
    () =>
      assignments
        .filter(
          (a) =>
            a.order.status !== "cancelled" &&
            a.order.shippingStatus === "delivered"
        )
        .reduce((sum, a) => sum + (a.paymentAmount || 0), 0),
    [assignments]
  );

  const totalPagarFiltered = useMemo(() => {
    if (deliveryFilter === "all") return null;
    return assignments
      .filter(
        (a) =>
          a.deliveryUser?.id === deliveryFilter &&
          a.order.status !== "cancelled" &&
          a.order.shippingStatus === "delivered"
      )
      .reduce((sum, a) => sum + (a.paymentAmount || 0), 0);
  }, [assignments, deliveryFilter]);

  const cityOptionsAssigned = useMemo(() => {
    const cities = assignments
      .map((a) => a.order?.receiverCity)
      .filter(Boolean);
    return ["all", ...new Set(cities)];
  }, [assignments]);

  const toDateOnly = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const dateLabel = useMemo(() => {
    const fmt = (d) =>
      d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
    if (!startDate && !endDate) return "FECHA";
    if (startDate && !endDate) return fmt(startDate);
    return `${fmt(startDate)} → ${fmt(endDate)}`;
  }, [startDate, endDate]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchDelivery =
        deliveryFilter === "all" || a.deliveryUser?.id === deliveryFilter;

      const matchSearch =
        search === "" ||
        (a.order?.buyerNickname ?? "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        (a.order?.packId ?? a.order?.id ?? "").toString().includes(search) ||
        (a.deliveryUser?.name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchCity =
        cityFilter === "all" || a.order?.receiverCity === cityFilter;

      let matchDate = true;
      if (startDate || endDate) {
        const d = toDateOnly(a.assignedAt);
        if (!d) return false;
        if (startDate && d < toDateOnly(startDate)) matchDate = false;
        if (endDate && d > toDateOnly(endDate)) matchDate = false;
      }

      return matchDelivery && matchSearch && matchCity && matchDate;
    });
  }, [assignments, search, cityFilter, startDate, endDate, deliveryFilter]);

  const hasActiveFilters =
    cityFilter !== "all" || startDate || endDate || deliveryFilter !== "all";

  const selectedDeliveryName = useMemo(
    () => deliveryUsers.find((u) => u.id === deliveryFilter)?.name ?? null,
    [deliveryUsers, deliveryFilter]
  );

  /* ── Scanner submit — acumula en pendingOrders ── */
  const submitCode = useCallback(
    async (value) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setScanLoading(true);
      setScanError(null);
      setScanWarning(null);

      try {
        const idMatch = trimmed.match(/"id"\s*:\s*"(\d+)"/);
        const resolvedCode = idMatch?.[1] ?? trimmed;

        const match = orders.find(
          (o) =>
            o.id === resolvedCode ||
            o.packId === resolvedCode ||
            o.shippingId === resolvedCode ||
            o.displayIdentifier?.toString() === resolvedCode
        );

        if (!match) throw new Error("Orden no encontrada");

        // Check if already assigned (either today or any day via order data)
        const currentAssignment = assignments.find((a) => a.orderId === match.id);
        const orderAssignment = match.deliveryAssignment;
        const existingAssignee = currentAssignment?.deliveryUser ?? orderAssignment?.deliveryUser;

        // ← acumular en lista, no reemplazar
        setPendingOrders((prev) => {
          if (prev.some((o) => o.id === match.id)) {
            setScanError("Esta orden ya está en la lista");
            return prev;
          }
          return [...prev, { ...match, reassignFrom: existingAssignee || null }];
        });

        if (existingAssignee) {
          const assigneeName = existingAssignee.name || "otro delivery";
          setScanWarning(
            `La orden #${match.packId ?? match.id} está asignada a ${assigneeName}. Se reasignará al confirmar.`
          );
        } else if (match.pickingStatus !== "packed") {
          setScanWarning(
            `La orden #${match.packId ?? match.id} tiene estado "${
              match.pickingStatus
            }" — no está empacada todavía`
          );
        }
      } catch (err) {
        setScanError(err.message);
      } finally {
        setScanLoading(false);
        setCode("");
        if (inputRef.current) inputRef.current.value = "";
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [orders, assignedOrderIds, assignments]
  );

  useEffect(() => {
    submitCodeRef.current = submitCode;
  }, [submitCode]);

  const handleScan = (e) => {
    e.preventDefault();
    const value = inputRef.current?.value || code;
    submitCode(value);
  };

  /* ── Confirmar asignación bulk ── */
  const handleBulkAssign = async () => {
    if (!selectedUser || pendingOrders.length === 0) return;
    setBulkAssigning(true);
    setBulkDone(null);
    const total = pendingOrders.length;
    const errors = [];

    await Promise.all(
      pendingOrders.map(async (order) => {
        try {
          const res = await apiFetch(`${API_URL}/delivery/assign`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              orderId: order.id,
              deliveryUserId: selectedUser,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
        } catch (err) {
          errors.push(`#${order.packId ?? order.id}: ${err.message}`);
        }
      })
    );

    await loadAll();
    setPendingOrders([]);
    setSelectedUser("");
    setBulkAssigning(false);
    setShowInput(false);
    setScanWarning(null);
    setScanError(null);
    setCode("");

    const assigned = total - errors.length;
    if (errors.length === 0) {
      showToast(
        "success",
        `${total} orden${total !== 1 ? "es" : ""} asignada${
          total !== 1 ? "s" : ""
        } correctamente`
      );
      setTab("assigned");
    } else {
      setBulkDone({ assigned, errors });
      showToast(
        "error",
        `${assigned > 0 ? `✓ ${assigned} asignada${assigned !== 1 ? "s" : ""} — ` : ""}✗ ${errors.length} orden${errors.length !== 1 ? "es" : ""} con error`,
        errors
      );
    }
  };

  /* ── Quitar asignación ── */
  const handleUnassign = async (orderId, displayId) => {
    if (!confirm(`¿Quitar la asignación de la orden #${displayId}?`)) return;
    try {
      const res = await apiFetch(`${API_URL}/delivery/assign/${orderId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      setAssignments((prev) => prev.filter((a) => a.orderId !== orderId));
      showToast("success", "Asignación eliminada");
    } catch {
      showToast("error", "No se pudo eliminar la asignación");
    }
  };

  const handleGenerateReport = (period) => {
    const result = generateDeliveryReport({
      assignments: filteredAssignments,
      period,
      deliveryName: selectedDeliveryName,
      cityFilter,
      search,
    });
    setReportModal(false);
    if (!result.ok) {
      showToast(
        "error",
        "Sin asignaciones en este período con los filtros activos"
      );
    } else {
      showToast("success", `Reporte generado · ${result.count} asignaciones`);
    }
  };

  /* ── Eliminar orden manual del backend si no fue asignada ── */
  const deleteManualOrder = async (orderId) => {
    if (!orderId.startsWith("MANUAL-")) return;
    try {
      await apiFetch(`${API_URL}/delivery/manual-order/${orderId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    } catch { /* silencioso — la orden puede ya estar asignada */ }
  };

  const removeFromPending = (orderId) => {
    deleteManualOrder(orderId);
    setPendingOrders((prev) => prev.filter((x) => x.id !== orderId));
  };

  const clearPendingOrders = () => {
    pendingOrders.forEach((o) => deleteManualOrder(o.id));
    setPendingOrders([]);
    setScanError(null);
    setScanWarning(null);
    setBulkDone(null);
  };

  /* ── Orden manual creada → agregar a pendingOrders ── */
  const handleManualCreated = (order) => {
    setPendingOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [
        ...prev,
        {
          ...order,
          displayIdentifier: order.id,
          packedOrders: [order.id],
          orderItems: [],
        },
      ];
    });
    setManualModal(false);
    showToast("success", `Orden manual #${order.id} creada`);
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="adl-root">
      <div className="adl-bg-grid" />
      <Layout
        subtitle="DELIVERY"
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      >
        <div className="adl-page">
          {/* ── Header ── */}
          <header className="adl-header">
            <div>
              <p className="adl-eyebrow">OPERACIONES</p>
              <h1 className="adl-title">ASIGNAR DELIVERY</h1>
              <p className="adl-sub">
                Elegí un delivery, escaneá los paquetes y confirmá todo junto
              </p>
            </div>

            <div className="adl-date-nav">
              <button
                className="adl-date-nav-btn"
                onClick={() => changeDate(-1)}
                title="Día anterior"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <input
                type="date"
                className="adl-date-nav-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button
                className="adl-date-nav-btn"
                onClick={() => changeDate(1)}
                title="Día siguiente"
                disabled={date >= todayISO()}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </header>

          <p className="adl-date-label">{formatDateLabel(date)}</p>

          <Toast toast={toast} onDismiss={dismissToast} />

          {/* ── Stats ── */}
          <div className="adl-stats">
            <div className="adl-stat">
              <span className="adl-stat-value adl-stat-value--blue">
                {assignments.length}
              </span>
              <span className="adl-stat-label">ASIGNADAS HOY</span>
            </div>
            <div className="adl-stat">
              <span className="adl-stat-value adl-stat-value--green">
                {
                  assignments.filter(
                    (a) => a.order?.shippingStatus === "delivered"
                  ).length
                }
              </span>
              <span className="adl-stat-label">ENTREGADAS</span>
            </div>
            <div className="adl-stat">
              <span className="adl-stat-value">{deliveryUsers.length}</span>
              <span className="adl-stat-label">DELIVERIES</span>
            </div>
            <div className="adl-stat adl-stat--highlight">
              <span className="adl-stat-value adl-stat-value--green">
                ${totalPagarHoy.toLocaleString("es-CL")}
              </span>
              <span className="adl-stat-label">A PAGAR HOY</span>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="adl-toolbar">
            {tab === "assigned" && (
              <div className="adl-search-wrapper">
                <svg
                  className="adl-search-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  className="adl-search"
                  placeholder="Buscar por orden, comprador o delivery..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            <div className="adl-filters-row">
              {/* Tabs ASIGNAR / ASIGNADAS */}
              <div className="adl-filter-group">
                <span className="adl-filter-label">VISTA</span>
                <div className="adl-tabs">
                  <button
                    className={`adl-tab ${
                      tab === "pending" ? "adl-tab--active" : ""
                    }`}
                    onClick={() => setTab("pending")}
                  >
                    ASIGNAR
                  </button>
                  <button
                    className={`adl-tab ${
                      tab === "assigned" ? "adl-tab--active" : ""
                    }`}
                    onClick={() => setTab("assigned")}
                  >
                    ASIGNADAS
                    {assignments.length > 0 && (
                      <span className="adl-tab-badge adl-tab-badge--blue">
                        {assignments.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filtros — solo en tab assigned */}
              {tab === "assigned" && (
                <>
                  {/* ── Filtro por DELIVERY ── */}
                  {deliveryUsers.length > 0 && (
                    <div className="adl-filter-group">
                      <span className="adl-filter-label">DELIVERY</span>
                      <div className="adl-city-wrapper" ref={deliveryFilterRef}>
                        <button
                          className={`adl-city-btn ${
                            deliveryFilter !== "all"
                              ? "adl-city-btn--active"
                              : ""
                          }`}
                          onClick={() => setDeliveryOpen((v) => !v)}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          {deliveryFilter === "all"
                            ? "TODOS"
                            : selectedDeliveryName?.toUpperCase()}
                          {deliveryFilter !== "all" && (
                            <span
                              className="adl-city-clear"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeliveryFilter("all");
                              }}
                            >
                              ×
                            </span>
                          )}
                          <span
                            className={`adl-city-chevron ${
                              deliveryOpen ? "adl-city-chevron--open" : ""
                            }`}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </span>
                        </button>
                        {deliveryOpen && (
                          <div className="adl-city-dropdown">
                            <button
                              className={`adl-city-option ${
                                deliveryFilter === "all"
                                  ? "adl-city-option--active"
                                  : ""
                              }`}
                              onClick={() => {
                                setDeliveryFilter("all");
                                setDeliveryOpen(false);
                              }}
                            >
                              TODOS LOS DELIVERIES
                              <span className="adl-city-count">
                                {assignments.length}
                              </span>
                            </button>
                            {deliveryUsers.map((u) => {
                              const count = assignments.filter(
                                (a) => a.deliveryUser?.id === u.id
                              ).length;
                              const paid = assignments
                                .filter(
                                  (a) =>
                                    a.deliveryUser?.id === u.id &&
                                    a.order.status !== "cancelled" &&
                                    a.order.shippingStatus === "delivered"
                                )
                                .reduce(
                                  (s, a) => s + (a.paymentAmount || 0),
                                  0
                                );
                              return (
                                <button
                                  key={u.id}
                                  className={`adl-city-option ${
                                    deliveryFilter === u.id
                                      ? "adl-city-option--active"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    setDeliveryFilter(u.id);
                                    setDeliveryOpen(false);
                                  }}
                                >
                                  <span className="adl-delivery-opt-name">
                                    <span className="adl-delivery-opt-avatar">
                                      {u.name?.[0]?.toUpperCase() ?? "?"}
                                    </span>
                                    {u.name}
                                  </span>
                                  <span className="adl-delivery-opt-meta">
                                    <span className="adl-city-count">
                                      {count}
                                    </span>
                                    {paid > 0 && (
                                      <span className="adl-delivery-opt-paid">
                                        ${paid.toLocaleString("es-CL")}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Filtro por ciudad ── */}
                  <div className="adl-filter-group">
                    <span className="adl-filter-label">CIUDAD</span>
                    <div className="adl-city-wrapper" ref={cityRef}>
                      <button
                        className={`adl-city-btn ${
                          cityFilter !== "all" ? "adl-city-btn--active" : ""
                        }`}
                        onClick={() => setCityOpen((v) => !v)}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {cityFilter === "all" ? "TODAS" : cityFilter}
                        {cityFilter !== "all" && (
                          <span
                            className="adl-city-clear"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCityFilter("all");
                            }}
                          >
                            ×
                          </span>
                        )}
                        <span
                          className={`adl-city-chevron ${
                            cityOpen ? "adl-city-chevron--open" : ""
                          }`}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </button>
                      {cityOpen && (
                        <div className="adl-city-dropdown">
                          {cityOptionsAssigned.map((city) => {
                            const count =
                              city === "all"
                                ? assignments.length
                                : assignments.filter(
                                    (a) => a.order?.receiverCity === city
                                  ).length;
                            return (
                              <button
                                key={city}
                                className={`adl-city-option ${
                                  cityFilter === city
                                    ? "adl-city-option--active"
                                    : ""
                                }`}
                                onClick={() => {
                                  setCityFilter(city);
                                  setCityOpen(false);
                                }}
                              >
                                {city === "all" ? "TODAS LAS CIUDADES" : city}
                                <span className="adl-city-count">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Filtro por fecha ── */}
                  <div className="adl-filter-group">
                    <span className="adl-filter-label">PERÍODO</span>
                    <div style={{ position: "relative" }}>
                      <button
                        ref={calendarBtn}
                        className={`adl-city-btn ${
                          startDate || endDate ? "adl-city-btn--active" : ""
                        }`}
                        onClick={() => setCalendarOpen((v) => !v)}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {dateLabel}
                        {(startDate || endDate) && (
                          <span
                            className="adl-city-clear"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDateRange([null, null]);
                            }}
                          >
                            ×
                          </span>
                        )}
                        <span
                          className={`adl-city-chevron ${
                            calendarOpen ? "adl-city-chevron--open" : ""
                          }`}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </button>
                      {calendarOpen && (
                        <div
                          className="adl-calendar-dropdown"
                          ref={calendarRef}
                        >
                          <DatePicker
                            selected={startDate}
                            onChange={(update) => {
                              setDateRange(update);
                              if (update[1]) setCalendarOpen(false);
                            }}
                            startDate={startDate}
                            endDate={endDate}
                            selectsRange
                            inline
                            maxDate={new Date()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Info filtros activos */}
            {tab === "assigned" && hasActiveFilters && (
              <div className="adl-active-filters">
                <span className="adl-active-filters-text">
                  Mostrando {filteredAssignments.length} asignación
                  {filteredAssignments.length !== 1 ? "es" : ""}
                  {deliveryFilter !== "all" && (
                    <span style={{ color: "#34d399", marginLeft: 8 }}>
                      · {selectedDeliveryName}
                    </span>
                  )}
                  {deliveryFilter !== "all" &&
                    totalPagarFiltered !== null &&
                    totalPagarFiltered > 0 && (
                      <span style={{ color: "#34d399", marginLeft: 4 }}>
                        ·{" "}
                        <strong>
                          ${totalPagarFiltered.toLocaleString("es-CL")}
                        </strong>{" "}
                        a pagar
                      </span>
                    )}
                  {cityFilter !== "all" && (
                    <span style={{ color: "#06b6d4", marginLeft: 8 }}>
                      · {cityFilter}
                    </span>
                  )}
                  {(startDate || endDate) && (
                    <span style={{ color: "#8b5cf6", marginLeft: 8 }}>
                      · {dateLabel}
                    </span>
                  )}
                </span>
                <button
                  className="adl-active-filters-clear"
                  onClick={() => {
                    setDeliveryFilter("all");
                    setCityFilter("all");
                    setDateRange([null, null]);
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
            {tab === "assigned" && (
              <button
                className="adl-report-btn"
                onClick={() => setReportModal(true)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                EXPORTAR PDF
              </button>
            )}
          </div>

          {/* ════════════════════════════════════════
              CONTENIDO POR TAB
          ════════════════════════════════════════ */}

          {/* Scanner de cámara — portal sobre todo */}
          {cameraOpen && (
            <CameraScanner
              onScan={(code) => {
                setCameraOpen(false);
                submitCode(code);
              }}
              onClose={() => setCameraOpen(false)}
            />
          )}

          {loading ? (
            <div className="adl-empty">
              <span className="adl-spin adl-spin--lg" />
            </div>
          ) : tab === "pending" ? (
            /* ══════════════════════════════
               TAB: ASIGNAR — flujo bulk
            ══════════════════════════════ */
            <div className="adl-scan-section">
              {/* ── PASO 1: elegir delivery ── */}
              <div className="adl-bulk-step">
                <p className="adl-label">ELEGIR DELIVERY</p>
                <div className="adl-city-wrapper" ref={deliverySelectRef}>
                  <button
                    className={`adl-city-btn ${
                      selectedUser ? "adl-city-btn--active" : ""
                    }`}
                    onClick={() => setDeliverySelectOpen((v) => !v)}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    {selectedUser
                      ? deliveryUsers
                          .find((u) => u.id === selectedUser)
                          ?.name?.toUpperCase()
                      : "SELECCIONAR DELIVERY"}
                    {selectedUser && (
                      <span
                        className="adl-city-clear"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser("");
                          setPendingOrders([]);
                          setScanError(null);
                          setScanWarning(null);
                          setBulkDone(null);
                        }}
                      >
                        ×
                      </span>
                    )}
                    <span
                      className={`adl-city-chevron ${
                        deliverySelectOpen ? "adl-city-chevron--open" : ""
                      }`}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </button>

                  {deliverySelectOpen && (
                    <div className="adl-city-dropdown">
                      {deliveryUsers.length === 0 ? (
                        <p
                          className="adl-no-delivery"
                          style={{ padding: "10px 14px" }}
                        >
                          No hay usuarios con rol Delivery activos
                        </p>
                      ) : (
                        deliveryUsers.map((u) => (
                          <button
                            key={u.id}
                            className={`adl-city-option ${
                              selectedUser === u.id
                                ? "adl-city-option--active"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedUser(u.id);
                              setPendingOrders([]);
                              setScanError(null);
                              setScanWarning(null);
                              setBulkDone(null);
                              setDeliverySelectOpen(false);
                            }}
                          >
                            <span className="adl-delivery-opt-name">
                              <span className="adl-delivery-opt-avatar">
                                {u.name?.[0]?.toUpperCase() ?? "?"}
                              </span>
                              {u.name}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── PASO 2: escanear paquetes ── */}
              <div
                className={`adl-bulk-step${
                  !selectedUser ? " adl-bulk-step--disabled" : ""
                }`}
              >
                <div className="adl-step-header">
                  <p className="adl-label">ESCANEAR PAQUETES</p>
                  <button
                    type="button"
                    className="adl-btn-manual"
                    disabled={!selectedUser}
                    onClick={() => setManualModal(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    ORDEN MANUAL
                  </button>
                </div>
                <div className="adl-scan-form-wrapper">
                  <div className="adl-scan-header">
                    <p className="adl-scan-label">
                      ESCANEAR O INGRESAR N° DE ORDEN
                    </p>
                    <span
                      className={`adl-scan-indicator ${
                        scanLoading ? "adl-scan-indicator--loading" :
                        scannerMode ? "adl-scan-indicator--active"  :
                        showInput   ? "adl-scan-indicator--manual"  : ""
                      }`}
                    >
                      {scanLoading
                        ? <span className="adl-scan-spinner" />
                        : <span className="adl-scan-dot" />
                      }
                      {scanLoading ? "BUSCANDO..." : scannerMode ? "LEYENDO..." : showInput ? "MANUAL" : "EN ESPERA"}
                    </span>
                  </div>
                  {!showInput ? (
                    <div className="adl-toggle-row">
                      <div className="adl-toggle-btn-wrap">
                        <button
                          type="button"
                          className="adl-toggle-btn"
                          disabled={!selectedUser}
                          onClick={() => {
                            setShowInput(true);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                        </button>
                        <span className="adl-toggle-tooltip">Ingresar número manualmente</span>
                      </div>
                      <div className="adl-camera-btn-wrap">
                        <button
                          type="button"
                          className="adl-btn-camera"
                          disabled={!selectedUser}
                          onClick={() => setCameraOpen(true)}
                        >
                          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        </button>
                        <span className="adl-toggle-tooltip">Escanear con cámara</span>
                      </div>
                    </div>
                  ) : (
                    <form className="adl-scan-form" onSubmit={handleScan}>
                      <div className="adl-scan-input-wrapper">
                        <svg
                          className="adl-scan-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="M21 21l-4.35-4.35" />
                        </svg>
                        <input
                          ref={inputRef}
                          type="text"
                          className={`adl-scan-input ${scannerMode ? "adl-scan-input--scanning" : ""}`}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder={selectedUser ? "Número de orden..." : "Primero elige un delivery..."}
                          disabled={!selectedUser}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="adl-scan-clear"
                          onClick={() => {
                            setCode("");
                            setShowInput(false);
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <button
                        type="submit"
                        className="adl-btn-primary"
                        disabled={scanLoading || !selectedUser}
                      >
                        {scanLoading ? (
                          <span className="adl-spin" />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        className="adl-btn-camera adl-btn-camera--inline"
                        onClick={() => setCameraOpen(true)}
                        disabled={!selectedUser}
                        title="Escanear con cámara"
                      >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </button>
                    </form>
                  )}
                </div>

                {scanWarning && (
                  <div className="adl-scan-warning">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {scanWarning}
                  </div>
                )}

                {scanError && (
                  <div className="adl-scan-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {scanError}
                  </div>
                )}

                {/* Lista acumulada de órdenes escaneadas */}
                {pendingOrders.length > 0 && (
                  <div className="adl-pending-list">
                    {pendingOrders.map((o, idx) => (
                      <div key={o.id} className="adl-pending-item">
                        <span className="adl-pending-idx">{idx + 1}</span>
                        <div className="adl-pending-info">
                          <span className="adl-pending-id">
                            #{o.packId ?? o.displayIdentifier ?? o.id}
                          </span>
                          <span className="adl-pending-buyer">
                            {o.buyerNickname ?? o.buyerName ?? "—"}
                          </span>
                          {o.reassignFrom && (
                            <span className="adl-pending-reassign">
                              ↻ Reasignar de {o.reassignFrom.name || "otro"}
                            </span>
                          )}
                          {!o.reassignFrom && o.pickingStatus !== "packed" && (
                            <span className="adl-pending-warn">
                              ⚠ {o.pickingStatus}
                            </span>
                          )}
                        </div>
                        <button
                          className="adl-pending-remove"
                          onClick={() => removeFromPending(o.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {pendingOrders.length === 0 && !scanError && !scanLoading && (
                  <div className="adl-empty">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.8"
                    >
                      <rect x="3" y="7" width="3" height="10" rx="1" />
                      <rect x="8" y="5" width="2" height="14" rx="1" />
                      <rect x="12" y="7" width="4" height="10" rx="1" />
                      <rect x="18" y="5" width="3" height="14" rx="1" />
                    </svg>
                    <p>ESPERANDO ESCANEO</p>
                  </div>
                )}
              </div>

              {/* ── PASO 3: confirmar ── */}
              {pendingOrders.length > 0 && (
                <div className="adl-bulk-step">
                  <p className="adl-label">③ CONFIRMAR ASIGNACIÓN</p>
                  <div className="adl-confirm-row">
                    <button
                      className="adl-btn-ghost"
                      onClick={clearPendingOrders}
                    >
                      Limpiar lista
                    </button>
                    <button
                      className="adl-btn-confirm"
                      onClick={handleBulkAssign}
                      disabled={bulkAssigning}
                    >
                      {bulkAssigning && <span className="adl-spin" />}
                      {bulkAssigning
                        ? "ASIGNANDO..."
                        : `CONFIRMAR ${pendingOrders.length} ORDEN${pendingOrders.length !== 1 ? "ES" : ""}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Errores parciales post-confirmación — ahora se muestran en el toast */}
            </div>
          ) : /* ══════════════════════════════
               TAB: ASIGNADAS — sin cambios
          ══════════════════════════════ */
          filteredAssignments.length === 0 ? (
            <div className="adl-empty">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
              <p>SIN ASIGNACIONES PARA ESTA FECHA</p>
            </div>
          ) : (
            <div className="adl-table-wrapper">
              <table className="adl-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>COMPRADOR</th>
                    <th>PRODUCTOS</th>
                    <th>ESTADO ENVÍO</th>
                    <th className="adl-th-city">CIUDAD</th>
                    <th>DELIVERY</th>
                    <th className="adl-th-date">ASIGNADO</th>
                    <th>PAGO</th>
                    <th className="adl-th-notes">NOTAS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((a, i) => (
                    <DeliveryAssignmentRow
                      key={a.id}
                      assignment={a}
                      index={i}
                      canManage={true}
                      onUnassign={handleUnassign}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
      {reportModal && (
        <ReportModal
          onClose={() => setReportModal(false)}
          onGenerate={handleGenerateReport}
        />
      )}
      {manualModal && (
        <ManualOrderModal
          onClose={() => setManualModal(false)}
          onCreated={handleManualCreated}
        />
      )}
    </div>
  );
}
