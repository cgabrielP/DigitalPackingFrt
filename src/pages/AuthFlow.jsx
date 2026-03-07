import { useState, useEffect } from "react"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
})

/* ─── Tokens ─────────────────────────────────────────────────── */
const saveSession = (token) => localStorage.setItem("app_token", token)
const clearSession = () => localStorage.removeItem("app_token")
const getSession = () => {
  const t = localStorage.getItem("app_token")
  if (!t) return null
  try {
    const payload = JSON.parse(atob(t.split(".")[1]))
    return payload.exp > Date.now() / 1000 ? payload : null
  } catch { return null }
}

/* ─── Styles ─────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:           #0a0a0a;
    --surface:      #111111;
    --elevated:     #171717;
    --hover:        #1c1c1c;
    --border:       #1f1f1f;
    --border-mid:   #2a2a2a;
    --border-hover: #444;
    --text:         #e8e8e8;
    --text-2:       #888;
    --text-3:       #555;
    --text-4:       #333;
    --amber:        #f59e0b;
    --amber-dim:    rgba(245,158,11,0.10);
    --amber-border: rgba(245,158,11,0.30);
    --blue:         #3b82f6;
    --green:        #16a34a;
    --red:          #ef4444;
    --red-dim:      rgba(239,68,68,0.10);
    --grid-line:    rgba(255,255,255,0.025);
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; }

  /* ── Grid bg ── */
  .af-root {
    min-height: 100vh;
    background: var(--bg);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .af-grid {
    position: fixed; inset: 0;
    background-image:
      linear-gradient(var(--grid-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  .af-glow {
    position: fixed;
    top: -200px; left: -200px;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  /* ── Card ── */
  .af-card {
    position: relative; z-index: 1;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 40px;
    width: 100%; max-width: 420px;
    animation: af-up 0.35s ease both;
  }

  /* ── Brand ── */
  .af-brand {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 32px;
  }

  .af-brand-icon {
    width: 38px; height: 38px;
    background: var(--elevated);
    border: 1px solid var(--border-mid);
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .af-brand-text { display: flex; flex-direction: column; gap: 1px; }

  .af-brand-name {
    font-family: 'Space Mono', monospace;
    font-size: 14px; font-weight: 700;
    color: var(--text); letter-spacing: 3px;
  }

  .af-brand-sub {
    font-family: 'Space Mono', monospace;
    font-size: 9px; color: var(--text-3);
    letter-spacing: 2px;
  }

  /* ── Tabs ── */
  .af-tabs {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 4px;
    background: var(--elevated);
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 4px;
    margin-bottom: 28px;
  }

  .af-tab {
    background: none; border: none; cursor: pointer;
    padding: 9px;
    font-family: 'Space Mono', monospace;
    font-size: 10px; letter-spacing: 1.5px;
    color: var(--text-3);
    border-radius: 6px;
    transition: background 0.2s, color 0.2s;
  }

  .af-tab:hover { color: var(--text-2); }

  .af-tab.active {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border-mid);
  }

  /* ── Form ── */
  .af-field { margin-bottom: 16px; }

  .af-label {
    display: block;
    font-family: 'Space Mono', monospace;
    font-size: 9px; letter-spacing: 2px;
    color: var(--text-3);
    margin-bottom: 7px;
  }

  .af-input {
    width: 100%;
    background: var(--elevated);
    border: 1px solid var(--border-mid);
    border-radius: 8px;
    padding: 12px 14px;
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
  }

  .af-input:focus { border-color: var(--border-hover); background: var(--hover); }
  .af-input::placeholder { color: var(--text-4); }

  /* ── Divider ── */
  .af-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 20px 0;
  }

  .af-divider-line { flex: 1; height: 1px; background: var(--border); }

  .af-divider-text {
    font-family: 'Space Mono', monospace;
    font-size: 9px; letter-spacing: 2px; color: var(--text-4);
  }

  /* ── Buttons ── */
  .af-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px;
    border: none; border-radius: 8px; cursor: pointer;
    font-family: 'Space Mono', monospace;
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    transition: opacity 0.2s, transform 0.15s;
  }

  .af-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .af-btn:active:not(:disabled) { transform: scale(0.98); }
  .af-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .af-btn-primary { background: var(--amber); color: #000; }
  .af-btn-ml      { background: #3483fa; color: #fff; }
  .af-btn-ghost {
    background: var(--elevated);
    border: 1px solid var(--border-mid);
    color: var(--text-2);
  }

  .af-btn-ghost:hover:not(:disabled) {
    border-color: var(--border-hover);
    color: var(--text);
  }

  /* ── Error / success ── */
  .af-alert {
    border-radius: 8px; padding: 12px 14px;
    font-size: 13px;
    display: flex; align-items: flex-start; gap: 9px;
    margin-bottom: 16px;
    animation: af-up 0.25s ease;
  }

  .af-alert-icon { flex-shrink: 0; margin-top: 1px; }

  .af-alert.error {
    background: var(--red-dim);
    border: 1px solid rgba(239,68,68,0.25);
    color: #fca5a5;
  }

  .af-alert.success {
    background: rgba(22,163,74,0.10);
    border: 1px solid rgba(22,163,74,0.25);
    color: #86efac;
  }

  /* ── Accounts page ── */
  .af-page { position: relative; z-index: 1; width: 100%; max-width: 560px; }

  .af-page-header { margin-bottom: 28px; }

  .af-page-title {
    font-family: 'Space Mono', monospace;
    font-size: 16px; font-weight: 700;
    color: var(--text); letter-spacing: 3px;
    margin-bottom: 4px;
  }

  .af-page-sub { font-size: 13px; color: var(--text-3); }

  /* ── Account list ── */
  .af-accounts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }

  .af-account-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 16px 20px;
    display: flex; align-items: center; gap: 14px;
    animation: af-up 0.3s ease both;
  }

  .af-account-avatar {
    width: 40px; height: 40px;
    background: var(--amber-dim);
    border: 1px solid var(--amber-border);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-family: 'Space Mono', monospace;
    font-size: 14px; font-weight: 700; color: var(--amber);
  }

  .af-account-info { flex: 1; min-width: 0; }

  .af-account-nick {
    font-weight: 600; font-size: 14px; color: var(--text);
    margin-bottom: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .af-account-meta {
    font-family: 'Space Mono', monospace;
    font-size: 9px; letter-spacing: 1px; color: var(--text-3);
  }

  .af-account-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px;
    border-radius: 20px;
    font-family: 'Space Mono', monospace;
    font-size: 9px; letter-spacing: 1px;
    background: rgba(22,163,74,0.10);
    border: 1px solid rgba(22,163,74,0.25);
    color: #86efac;
    flex-shrink: 0;
  }

  .af-account-badge-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #16a34a; flex-shrink: 0;
  }

  /* ── Empty accounts ── */
  .af-empty {
    background: var(--surface);
    border: 1px dashed var(--border-mid);
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    margin-bottom: 16px;
  }

  .af-empty p {
    font-family: 'Space Mono', monospace;
    font-size: 10px; letter-spacing: 2px;
    color: var(--text-4);
    margin-top: 12px;
  }

  /* ── Nav top ── */
  .af-nav {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 32px;
  }

  .af-nav-brand { display: flex; align-items: center; gap: 8px; }

  .af-nav-logo {
    font-family: 'Space Mono', monospace;
    font-size: 13px; font-weight: 700;
    color: var(--text); letter-spacing: 3px;
  }

  .af-nav-dot { color: var(--amber); font-size: 8px; }

  .af-nav-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--elevated);
    border: 1px solid var(--border-mid);
    border-radius: 7px;
    padding: 7px 14px;
    font-family: 'Space Mono', monospace;
    font-size: 10px; letter-spacing: 1px; color: var(--text-2);
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }

  .af-nav-btn:hover { border-color: var(--border-hover); color: var(--text); }

  /* ── Add account btn ── */
  .af-add-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px;
    background: none;
    border: 1px dashed var(--border-mid);
    border-radius: 8px; cursor: pointer;
    font-family: 'Space Mono', monospace;
    font-size: 10px; letter-spacing: 1.5px; color: var(--text-3);
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    margin-bottom: 16px;
  }

  .af-add-btn:hover {
    border-color: var(--amber-border);
    color: var(--amber);
    background: var(--amber-dim);
  }

  /* ── Go to app btn ── */
  .af-cta {
    display: flex; flex-direction: column; gap: 8px;
    padding: 16px 20px;
    background: var(--amber-dim);
    border: 1px solid var(--amber-border);
    border-radius: 10px;
    margin-top: 8px;
  }

  .af-cta-title {
    font-family: 'Space Mono', monospace;
    font-size: 10px; letter-spacing: 2px; color: var(--amber);
  }

  .af-cta-sub { font-size: 12px; color: var(--text-3); }

  /* ── Spinner ── */
  .af-spin {
    display: inline-block;
    width: 13px; height: 13px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: af-rotate 0.7s linear infinite;
    flex-shrink: 0;
  }

  /* ── Keyframes ── */
  @keyframes af-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes af-rotate { to { transform: rotate(360deg); } }

  @media (max-width: 480px) {
    .af-card { padding: 28px 20px; }
  }
`

/* ─── Icons ── */
const IconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8">
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/>
    <path d="M12 3v14M3.27 6.96L12 12l8.73-5.04"/>
  </svg>
)

const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
  </svg>
)

const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
)

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

/* ─── Alert ── */
const Alert = ({ type, msg }) => (
  <div className={`af-alert ${type}`}>
    <span className="af-alert-icon">{type === "error" ? "✕" : "✓"}</span>
    <span>{msg}</span>
  </div>
)

/* ════════════════════════════════════════
   REGISTER FORM
════════════════════════════════════════ */
const RegisterForm = ({ onSuccess }) => {
  const [form, setForm]     = useState({ name: "", email: "", password: "", tenantName: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError(null)
    if (!form.name || !form.email || !form.password)
      return setError("Completá todos los campos obligatorios")

    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveSession(data.token)
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <Alert type="error" msg={error} />}

      <div className="af-field">
        <label className="af-label">NOMBRE</label>
        <input className="af-input" placeholder="Tu nombre" value={form.name} onChange={set("name")} />
      </div>

      <div className="af-field">
        <label className="af-label">EMPRESA (OPCIONAL)</label>
        <input className="af-input" placeholder="Nombre de tu empresa" value={form.tenantName} onChange={set("tenantName")} />
      </div>

      <div className="af-field">
        <label className="af-label">EMAIL</label>
        <input className="af-input" type="email" placeholder="tu@email.com" value={form.email} onChange={set("email")} />
      </div>

      <div className="af-field" style={{ marginBottom: 24 }}>
        <label className="af-label">CONTRASEÑA</label>
        <input className="af-input" type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={set("password")} />
      </div>

      <button className="af-btn af-btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="af-spin" /> : null}
        {loading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════
   LOGIN FORM
════════════════════════════════════════ */
const LoginForm = ({ onSuccess }) => {
  const [form, setForm]       = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      saveSession(data.token)
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit() }

  return (
    <div>
      {error && <Alert type="error" msg={error} />}

      <div className="af-field">
        <label className="af-label">EMAIL</label>
        <input className="af-input" type="email" placeholder="tu@email.com"
          value={form.email} onChange={set("email")} onKeyDown={handleKey} />
      </div>

      <div className="af-field" style={{ marginBottom: 24 }}>
        <label className="af-label">CONTRASEÑA</label>
        <input className="af-input" type="password" placeholder="••••••••"
          value={form.password} onChange={set("password")} onKeyDown={handleKey} />
      </div>

      <button className="af-btn af-btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="af-spin" /> : null}
        {loading ? "INGRESANDO..." : "INGRESAR"}
      </button>
    </div>
  )
}

/* ════════════════════════════════════════
   ACCOUNTS PAGE
════════════════════════════════════════ */
const AccountsPage = ({ user, tenant, onLogout }) => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [notice, setNotice]     = useState(null)

  const loadAccounts = async () => {
    try {
      const res  = await fetch(`${API_URL}/auth/ml/accounts`, { headers: getHeaders() })
      const data = await res.json()
      if (res.ok) setAccounts(data)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    loadAccounts()
    // Detectar redirect de ML con ?connected=true/false
    const params = new URLSearchParams(window.location.search)
    const conn   = params.get("connected")
    if (conn === "true")  { setNotice({ type: "success", msg: "Cuenta de Mercado Libre conectada correctamente" }); loadAccounts() }
    if (conn === "false") { setNotice({ type: "error",   msg: "No se pudo conectar la cuenta de Mercado Libre" }) }
    if (conn) window.history.replaceState({}, "", window.location.pathname)
  }, [])

  const handleConnect = () => {
    setConnecting(true)
    window.location.href = `${API_URL}/auth/mercadolibre`
  }

  const goToApp = () => {
    window.location.href = "/orders"
  }

  return (
    <div className="af-page">

      {/* Nav */}
      <div className="af-nav">
        <div className="af-nav-brand">
          <span className="af-nav-logo">PICKING</span>
          <span className="af-nav-dot">●</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "var(--text-3)" }}>SYSTEM</span>
        </div>
        <button className="af-nav-btn" onClick={onLogout}>
          <IconLogout /> SALIR
        </button>
      </div>

      {/* Header */}
      <div className="af-page-header">
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 3, color: "var(--text-3)", marginBottom: 8 }}>
          BIENVENIDO, {user?.name?.toUpperCase()}
        </p>
        <h1 className="af-page-title">CUENTAS ML</h1>
        <p className="af-page-sub">
          Conectá las cuentas de Mercado Libre de <strong style={{ color: "var(--text)" }}>{tenant?.name}</strong>
        </p>
      </div>

      {/* Notice */}
      {notice && <Alert type={notice.type} msg={notice.msg} />}

      {/* Account list */}
      {loading ? (
        <div className="af-empty">
          <span className="af-spin" style={{ width: 24, height: 24, borderWidth: 3 }} />
        </div>
      ) : accounts.length === 0 ? (
        <div className="af-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          <p>SIN CUENTAS CONECTADAS</p>
        </div>
      ) : (
        <div className="af-accounts">
          {accounts.map((acc, i) => (
            <div key={acc.id} className="af-account-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="af-account-avatar">
                {(acc.nickname ?? "ML")[0].toUpperCase()}
              </div>
              <div className="af-account-info">
                <p className="af-account-nick">{acc.nickname ?? `Cuenta ${acc.mlUserId}`}</p>
                <p className="af-account-meta">
                  ID {acc.mlUserId} · {acc.lastSyncedAt
                    ? `Sync ${new Date(acc.lastSyncedAt).toLocaleDateString("es-CL")}`
                    : "Sin sync aún"}
                </p>
              </div>
              <div className="af-account-badge">
                <span className="af-account-badge-dot" />
                ACTIVA
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conectar nueva cuenta */}
      <button className="af-add-btn" onClick={handleConnect} disabled={connecting}>
        {connecting ? <span className="af-spin" /> : <IconPlus />}
        {connecting ? "REDIRIGIENDO..." : "CONECTAR CUENTA DE MERCADO LIBRE"}
      </button>

      {/* CTA ir a la app */}
      {accounts.length > 0 && (
        <div className="af-cta">
          <p className="af-cta-title">✓ TODO LISTO</p>
          <p className="af-cta-sub">
            Tenés {accounts.length} cuenta{accounts.length !== 1 ? "s" : ""} conectada{accounts.length !== 1 ? "s" : ""}.
            Ya podés sincronizar y gestionar tus órdenes.
          </p>
          <button className="af-btn af-btn-primary" style={{ marginTop: 4 }} onClick={goToApp}>
            IR A ÓRDENES <IconArrow />
          </button>
        </div>
      )}

    </div>
  )
}

/* ════════════════════════════════════════
   ROOT
════════════════════════════════════════ */
export default function AuthFlow() {
  const [tab,    setTab]    = useState("login")   // "login" | "register"
  const [screen, setScreen] = useState("auth")    // "auth" | "accounts"
  const [user,   setUser]   = useState(null)
  const [tenant, setTenant] = useState(null)

  // Si ya hay sesión válida, ir directo a cuentas
  useEffect(() => {
    const session = getSession()
    if (session) {
      setScreen("accounts")
      // Cargamos info del usuario del token (no hace falta fetch extra)
      setUser({ name: session.name ?? "Usuario" })
      setTenant({ name: "" })
    }
  }, [])

  const handleAuthSuccess = ({ user, tenant }) => {
    setUser(user)
    setTenant(tenant)
    setScreen("accounts")
  }

  const handleLogout = () => {
    clearSession()
    setScreen("auth")
    setUser(null)
    setTenant(null)
  }

  return (
    <>
      <style>{css}</style>
      <div className="af-root">
        <div className="af-grid" />
        <div className="af-glow" />

        {screen === "auth" ? (
          <div className="af-card">

            {/* Brand */}
            <div className="af-brand">
              <div className="af-brand-icon"><IconBox /></div>
              <div className="af-brand-text">
                <span className="af-brand-name">PICKING</span>
                <span className="af-brand-sub">SISTEMA DE EMPAQUE</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="af-tabs">
              <button className={`af-tab ${tab === "login" ? "active" : ""}`}    onClick={() => setTab("login")}>INGRESAR</button>
              <button className={`af-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>REGISTRARSE</button>
            </div>

            {/* Form */}
            {tab === "login"
              ? <LoginForm    onSuccess={handleAuthSuccess} />
              : <RegisterForm onSuccess={handleAuthSuccess} />
            }

            {/* Divider + ML directo */}
            <div className="af-divider">
              <div className="af-divider-line" />
              <span className="af-divider-text">O</span>
              <div className="af-divider-line" />
            </div>

            <button
              className="af-btn af-btn-ml"
              onClick={() => { window.location.href = `${API_URL}/auth/mercadolibre` }}
            >
              <IconLink /> CONECTAR CON MERCADO LIBRE
            </button>

          </div>
        ) : (
          <AccountsPage user={user} tenant={tenant} onLogout={handleLogout} />
        )}
      </div>
    </>
  )
}