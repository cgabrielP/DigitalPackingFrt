import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import "../pages/Settings.css";

const API_URL = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

const getSession = () => {
  try {
    return JSON.parse(atob(localStorage.getItem("app_token").split(".")[1]));
  } catch {
    return null;
  }
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

const daysLeft = (d) => {
  if (!d) return null;
  const diff = new Date(d) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const STATUS_LABEL = {
  ACTIVE: "ACTIVA",
  EXPIRED: "EXPIRADA",
  CANCELLED: "CANCELADA",
};
const PLAN_LABEL = { TRIAL: "PRUEBA GRATUITA", PAID: "PLAN PAGO" };

export default function ManageSubscription() {
  const navigate = useNavigate();
  const session = getSession();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("picking_theme") || "light"
  );
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("picking_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    fetch(`${API_URL}/api/subscription`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSub(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const isTrial = sub?.plan === "TRIAL";
  const isExpired = sub?.status === "EXPIRED" || sub?.status === "CANCELLED";
  const remaining = isTrial ? daysLeft(sub?.trialEndsAt) : null;
  const consumed =
    remaining !== null ? Math.min(100, ((7 - remaining) / 7) * 100) : 0;

  const statusColor =
    {
      ACTIVE: {
        color: "#22c55e",
        bg: "rgba(34,197,94,0.1)",
        border: "rgba(34,197,94,0.2)",
      },
      EXPIRED: {
        color: "#f87171",
        bg: "rgba(239,68,68,0.1)",
        border: "rgba(239,68,68,0.2)",
      },
      CANCELLED: {
        color: "#888",
        bg: "var(--bg-elevated)",
        border: "var(--border-mid)",
      },
    }[sub?.status] ?? {};

  return (
    <div className="st-root">
      <Layout subtitle="SYSTEM" theme={theme} onToggleTheme={toggleTheme}>
        <div className="st-page">
          {/* ── Header ── */}
          <header className="st-header">
            <p className="st-header-eyebrow">
              {session?.name ? session.name.toUpperCase() : "ADMIN"}
            </p>
            <h1 className="st-header-title">SUSCRIPCIÓN</h1>
            <p className="st-header-sub">Estado y gestión de tu plan actual</p>
          </header>
          {/* ── Loading ── */}
          {loading && (
            <div className="st-empty">
              <span className="st-spin st-spin--lg" />
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="st-alert st-alert--error">
              <span>✕</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Contenido ── */}
          {sub && !loading && (
            <>
              {/* ── Sección plan ── */}
              <section className="st-section">
                <p className="st-section-label">PLAN ACTUAL</p>

                <div
                  className="st-account-card"
                  style={{
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 16,
                  }}
                >
                  {/* Fila superior: nombre + badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 14 }}
                    >
                      <div
                        className="st-account-avatar"
                        style={{ fontSize: 18 }}
                      >
                        {isTrial ? "⏱" : "✓"}
                      </div>
                      <div>
                        <p className="st-account-nick">
                          {PLAN_LABEL[sub.plan] ?? sub.plan}
                        </p>
                        <p className="st-account-meta">
                          {isTrial
                            ? `Prueba gratuita · ${
                                remaining !== null
                                  ? `${remaining} día${
                                      remaining !== 1 ? "s" : ""
                                    } restante${remaining !== 1 ? "s" : ""}`
                                  : "Finalizada"
                              }`
                            : "Plan activo"}
                        </p>
                      </div>
                    </div>
                    <span
                      className="st-account-badge"
                      style={{
                        color: statusColor.color,
                        background: statusColor.bg,
                        borderColor: statusColor.border,
                      }}
                    >
                      {sub?.status === "ACTIVE" && (
                        <span
                          className="st-badge-dot"
                          style={{ background: statusColor.color }}
                        />
                      )}
                      {STATUS_LABEL[sub.status] ?? sub.status}
                    </span>
                  </div>

                  {/* Barra de progreso — solo trial activo */}
                  {isTrial && !isExpired && (
                    <div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "var(--border)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${consumed}%`,
                            background: consumed >= 85 ? "#f87171" : "#f59e0b",
                            borderRadius: 2,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <p
                        style={{
                          fontFamily: "Space Mono, monospace",
                          fontSize: 9,
                          letterSpacing: 1,
                          color: "var(--text-muted)",
                          marginTop: 6,
                        }}
                      >
                        {remaining !== null && `${7 - remaining} DE 7 DÍAS UTILIZADOS`}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* ── Sección fechas ── */}
              <section className="st-section">
                <p className="st-section-label">FECHAS</p>
                <div
                  className="st-account-card"
                  style={{ gap: 0, padding: 0, overflow: "hidden" }}
                >
                  {isTrial ? (
                    <>
                      <div
                        style={{
                          padding: "14px 20px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <p
                          className="st-account-meta"
                          style={{ marginBottom: 4 }}
                        >
                          INICIO
                        </p>
                        <p className="st-account-nick" style={{ fontSize: 13 }}>
                          {fmtDate(sub.createdAt)}
                        </p>
                      </div>
                      <div style={{ padding: "14px 20px" }}>
                        <p
                          className="st-account-meta"
                          style={{ marginBottom: 4 }}
                        >
                          VENCIMIENTO
                        </p>
                        <p className="st-account-nick" style={{ fontSize: 13 }}>
                          {fmtDate(sub.trialEndsAt)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          padding: "14px 20px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <p
                          className="st-account-meta"
                          style={{ marginBottom: 4 }}
                        >
                          PERÍODO ACTUAL
                        </p>
                        <p className="st-account-nick" style={{ fontSize: 13 }}>
                          {fmtDate(sub.currentPeriodStart)}
                        </p>
                      </div>
                      <div style={{ padding: "14px 20px" }}>
                        <p
                          className="st-account-meta"
                          style={{ marginBottom: 4 }}
                        >
                          PRÓXIMO COBRO
                        </p>
                        <p className="st-account-nick" style={{ fontSize: 13 }}>
                          {fmtDate(sub.currentPeriodEnd)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* ── CTA upgrade ── */}
              {(isTrial || isExpired) && (
                <div className="st-cta">
                  <div className="st-cta-text">
                    <p className="st-cta-title">
                      {isExpired ? "⚠ PRUEBA FINALIZADA" : "✦ ACTIVA TU PLAN"}
                    </p>
                    <p className="st-cta-sub">
                      {isExpired
                        ? "Tu período de prueba finalizó. Activa un plan para continuar operando."
                        : `Te quedan ${remaining} día${
                            remaining !== 1 ? "s" : ""
                          } de prueba gratuita.`}
                    </p>
                  </div>
                  <button
                    className="st-cta-btn"
                    onClick={() => navigate("/select-plan")}
                  >
                    VER PLANES →
                  </button>
                </div>
              )}

              {/* ── Soporte ── */}
              <section className="st-section" style={{ marginTop: 8 }}>
                <p className="st-section-label">SOPORTE</p>
                <div
                  className="st-account-card"
                  style={{ justifyContent: "space-between" }}
                >
                  <div>
                    <p className="st-account-nick" style={{ fontSize: 13 }}>
                      ¿Necesitas ayuda?
                    </p>
                    <p className="st-account-meta">Contactanos por WhatsApp</p>
                  </div>
                  <a
                    href={`https://wa.me/${import.meta.env.WHATSAPP_NUMBER}?text=Hola,%20necesito%20asistencia%20con%20mi%20suscripción%20en%20DigitalPacking`}
                    target="_blank"
                    rel="noreferrer"
                    className="st-add-btn"
                    style={{
                      width: "auto",
                      marginTop: 0,
                      padding: "8px 16px",
                      border: "1px solid var(--border-mid)",
                    }}
                  >
                    Contactar →
                  </a>
                </div>
              </section>
            </>
          )}
        </div>
      </Layout>
    </div>
  );
}
