import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, logout } from "../utils/auth";
import MarketplaceBadge from "../components/MarketplaceBadge";
import Layout from "../components/Layout";
import "./Settings.css";

const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

const getSession = () => {
  try {
    const t = localStorage.getItem("app_token");
    return JSON.parse(atob(t.split(".")[1]));
  } catch {
    return null;
  }
};

/* ── Marketplace config ── */
const MARKETPLACES = [
  {
    key: "MERCADOLIBRE",
    label: "Mercado Libre",
    type: "oauth",
    fields: [],
  },
  {
    key: "FALABELLA",
    label: "Falabella",
    type: "apikey",
    fields: [
      { name: "userId", label: "User ID", placeholder: "ej: user@email.com" },
      { name: "apiKey", label: "API Key", placeholder: "Tu API Key de Seller Center", secret: true },
      { name: "apiUrl", label: "API URL", placeholder: "https://sellercenter-api.falabella.com", defaultValue: "https://sellercenter-api.falabella.com" },
    ],
  },
  {
    key: "RIPLEY",
    label: "Ripley",
    type: "apikey",
    fields: [
      { name: "apiKey", label: "API Key", placeholder: "Tu API Key de Mirakl", secret: true },
      { name: "shopId", label: "Shop ID (opcional)", placeholder: "ej: 1234" },
    ],
  },
];

/* ── Alert ── */
const Alert = ({ type, msg }) => (
  <div className={`st-alert st-alert--${type}`}>
    <span>{type === "error" ? "✕" : "✓"}</span>
    <span>{msg}</span>
  </div>
);

/* ── Icons ── */
const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

/* ── Connect Modal ── */
const ConnectModal = ({ onClose, onConnected, notice: setNotice }) => {
  const [step, setStep] = useState("choose"); // choose | form
  const [selected, setSelected] = useState(null);
  const [nickname, setNickname] = useState("");
  const [credentials, setCredentials] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectMarketplace = (mp) => {
    if (mp.type === "oauth") {
      // ML: redirect to OAuth flow
      const token = localStorage.getItem("app_token");
      window.location.href = `${API_URL}/auth/mercadolibre?token=${token}`;
      return;
    }
    setSelected(mp);
    setStep("form");
    // Pre-fill default values
    const defaults = {};
    mp.fields.forEach((f) => {
      if (f.defaultValue) defaults[f.name] = f.defaultValue;
    });
    setCredentials(defaults);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!nickname.trim()) {
      setError("Ingresa un nombre para la cuenta");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          marketplace: selected.key,
          nickname: nickname.trim(),
          credentials,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error conectando cuenta");
      setNotice({ type: "success", msg: `Cuenta de ${selected.label} conectada correctamente` });
      onConnected();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="st-modal-overlay" onClick={onClose}>
      <div className="st-modal" onClick={(e) => e.stopPropagation()}>
        <div className="st-modal-header">
          <h2 className="st-modal-title">
            {step === "choose" ? "CONECTAR MARKETPLACE" : `CONECTAR ${selected.label.toUpperCase()}`}
          </h2>
          <button className="st-modal-close" onClick={onClose}><IconX /></button>
        </div>

        {step === "choose" && (
          <div className="st-mp-grid">
            {MARKETPLACES.map((mp) => (
              <button
                key={mp.key}
                className="st-mp-option"
                onClick={() => handleSelectMarketplace(mp)}
              >
                <MarketplaceBadge marketplace={mp.key} size="md" />
                <span className="st-mp-option-label">{mp.label}</span>
                <span className="st-mp-option-type">
                  {mp.type === "oauth" ? "OAuth" : "API Key"}
                </span>
              </button>
            ))}
          </div>
        )}

        {step === "form" && (
          <form className="st-connect-form" onSubmit={handleSubmit}>
            <div className="st-field">
              <label className="st-field-label">NOMBRE DE LA CUENTA</label>
              <input
                className="st-field-input"
                type="text"
                placeholder={`ej: Mi cuenta ${selected.label}`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                autoFocus
              />
            </div>

            {selected.fields.map((field) => (
              <div key={field.name} className="st-field">
                <label className="st-field-label">{field.label.toUpperCase()}</label>
                <input
                  className="st-field-input"
                  type={field.secret ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={credentials[field.name] || ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                />
              </div>
            ))}

            {error && (
              <div className="st-alert st-alert--error" style={{ marginBottom: 0 }}>
                <span>✕</span>
                <span>{error}</span>
              </div>
            )}

            <div className="st-modal-actions">
              <button type="button" className="st-btn-cancel" onClick={onClose}>
                CANCELAR
              </button>
              <button type="submit" className="st-btn-connect" disabled={saving}>
                {saving ? <span className="st-spin" /> : <IconPlus />}
                {saving ? "CONECTANDO..." : "CONECTAR"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* ── Main Settings ── */
export default function Settings() {
  const [mlAccounts, setMlAccounts] = useState([]);
  const [mpAccounts, setMpAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState(null);
  const navigate = useNavigate();

  const session = getSession();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("picking_theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("picking_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const loadAccounts = async () => {
    try {
      // Load both ML legacy accounts and new marketplace accounts
      const [mlRes, mpRes] = await Promise.all([
        apiFetch(`${API_URL}/auth/ml/accounts`, { headers: getHeaders() }),
        apiFetch(`${API_URL}/api/accounts`, { headers: getHeaders() }),
      ]);

      if (mlRes.status === 401) { logout(); return; }

      const mlData = mlRes.ok ? await mlRes.json() : [];
      const mpData = mpRes.ok ? await mpRes.json() : [];

      setMlAccounts(mlData);
      setMpAccounts(mpData);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();

    const params = new URLSearchParams(window.location.search);
    const conn = params.get("connected");
    if (conn === "true") {
      setNotice({ type: "success", msg: "Cuenta de Mercado Libre conectada correctamente" });
      loadAccounts();
    }
    if (conn === "false") {
      setNotice({ type: "error", msg: "No se pudo conectar la cuenta de Mercado Libre" });
    }
    if (conn) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Merge ML accounts and marketplace accounts into a single list
  // ML accounts that also exist in mpAccounts (by nickname) → show marketplace version
  const allAccounts = [
    ...mlAccounts.map((acc) => ({
      id: acc.id,
      marketplace: "MERCADOLIBRE",
      nickname: acc.nickname ?? `Cuenta ${acc.mlUserId}`,
      isActive: true,
      lastSyncedAt: acc.lastSyncedAt,
      meta: `ID ${acc.mlUserId}`,
      source: "ml",
    })),
    ...mpAccounts
      .filter((acc) => acc.marketplace !== "MERCADOLIBRE") // avoid duplicates
      .map((acc) => ({
        id: acc.id,
        marketplace: acc.marketplace,
        nickname: acc.nickname,
        isActive: acc.isActive,
        lastSyncedAt: acc.lastSyncedAt,
        meta: acc.marketplace,
        source: "mp",
      })),
  ];

  const handleDisconnect = async (account) => {
    if (account.source !== "mp") return; // Can't disconnect ML via this API
    if (!confirm(`¿Desconectar "${account.nickname}"?`)) return;
    try {
      await apiFetch(`${API_URL}/api/accounts/${account.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      setNotice({ type: "success", msg: `"${account.nickname}" desconectada` });
      loadAccounts();
    } catch {
      setNotice({ type: "error", msg: "Error desconectando cuenta" });
    }
  };

  const formatSync = (date) => {
    if (!date) return "Sin sync aún";
    return `Sync ${new Date(date).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="st-root">
      <div className="st-bg-glow" />

      <Layout subtitle="SYSTEM" theme={theme} onToggleTheme={toggleTheme}>
        <div className="st-page">
          <header className="st-header">
            <p className="st-header-eyebrow">
              BIENVENIDO{session?.name ? `, ${session.name.toUpperCase()}` : ""}
            </p>
            <h1 className="st-header-title">CUENTAS MARKETPLACE</h1>
            <p className="st-header-sub">
              Conectá cuentas de Mercado Libre, Falabella y más
            </p>
          </header>

          {notice && <Alert type={notice.type} msg={notice.msg} />}

          <section className="st-section">
            <p className="st-section-label">
              CUENTAS CONECTADAS
              <span className="st-section-count">{allAccounts.length}</span>
            </p>

            {loading ? (
              <div className="st-empty">
                <span className="st-spin st-spin--lg" />
              </div>
            ) : allAccounts.length === 0 ? (
              <div className="st-empty">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
                <p>SIN CUENTAS CONECTADAS</p>
              </div>
            ) : (
              <div className="st-accounts">
                {allAccounts.map((acc, i) => (
                  <div
                    key={`${acc.source}-${acc.id}`}
                    className="st-account-card"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="st-account-avatar-wrap">
                      <MarketplaceBadge marketplace={acc.marketplace} size="md" />
                    </div>
                    <div className="st-account-info">
                      <p className="st-account-nick">{acc.nickname}</p>
                      <p className="st-account-meta">
                        {acc.meta} · {formatSync(acc.lastSyncedAt)}
                      </p>
                    </div>
                    <div className="st-account-actions">
                      {acc.isActive ? (
                        <span className="st-account-badge">
                          <span className="st-badge-dot" />
                          ACTIVA
                        </span>
                      ) : (
                        <span className="st-account-badge st-account-badge--inactive">
                          INACTIVA
                        </span>
                      )}
                      {acc.source === "mp" && acc.isActive && (
                        <button
                          className="st-disconnect-btn"
                          onClick={() => handleDisconnect(acc)}
                          title="Desconectar"
                        >
                          <IconX />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="st-add-btn"
              onClick={() => setShowModal(true)}
            >
              <IconPlus />
              CONECTAR CUENTA
            </button>
          </section>

          {allAccounts.length > 0 && (
            <div className="st-cta">
              <div className="st-cta-text">
                <p className="st-cta-title">✓ TODO LISTO</p>
                <p className="st-cta-sub">
                  {allAccounts.length} cuenta{allAccounts.length !== 1 ? "s" : ""}{" "}
                  conectada{allAccounts.length !== 1 ? "s" : ""}. Ya podés
                  sincronizar y gestionar tus órdenes.
                </p>
              </div>
              <button className="st-cta-btn" onClick={() => navigate("/orders")}>
                IR A ÓRDENES <IconArrow />
              </button>
            </div>
          )}
        </div>
      </Layout>

      {showModal && (
        <ConnectModal
          onClose={() => setShowModal(false)}
          onConnected={loadAccounts}
          notice={setNotice}
        />
      )}
    </div>
  );
}
