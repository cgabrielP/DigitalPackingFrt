import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../utils/auth";
import Header from "../components/Header";
import "./AdminPanel.css";
import Layout from "../components/Layout";

const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

const ROLES = [
  {
    key: "PICKER",
    label: "Picker",
    desc: "Escanea y empaca órdenes",
    color: "blue",
  },
  {
    key: "DELIVERY",
    label: "Delivery",
    desc: "Ve órdenes listas para despacho",
    color: "green",
  },
  {
    key: "SUPERVISOR",
    label: "Supervisor",
    desc: "Ve todo, puede empacar y reasignar",
    color: "purple",
  },
  {
    key: "ADMIN",
    label: "Admin",
    desc: "Acceso completo al sistema",
    color: "amber",
  },
];

const ROLE_COLOR = {
  ADMIN: "amber",
  SUPERVISOR: "purple",
  PICKER: "blue",
  DELIVERY: "green",
};

/* ── Icons ── */
const IconBack = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

const IconPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconTrash = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);

const IconLogout = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

/* ── Alert ── */
const Alert = ({ type, msg, onClose }) => (
  <div className={`ap-alert ap-alert--${type}`}>
    <span>{type === "error" ? "✕" : "✓"}</span>
    <span style={{ flex: 1 }}>{msg}</span>
    {onClose && (
      <button className="ap-alert-close" onClick={onClose}>
        ×
      </button>
    )}
  </div>
);

/* ════════════════════════════════════════
   MODAL CREAR USUARIO
════════════════════════════════════════ */
const CreateUserModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PICKER",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.name || !form.email || !form.password)
      return setError("Completá todos los campos");

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ap-modal-header">
          <p className="ap-modal-title">NUEVO USUARIO</p>
          <button className="ap-modal-close" onClick={onClose}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <Alert type="error" msg={error} />}

        <div className="ap-field">
          <label className="ap-label">NOMBRE</label>
          <input
            className="ap-input"
            placeholder="Nombre completo"
            value={form.name}
            onChange={set("name")}
          />
        </div>

        <div className="ap-field">
          <label className="ap-label">EMAIL</label>
          <input
            className="ap-input"
            type="email"
            placeholder="usuario@empresa.com"
            value={form.email}
            onChange={set("email")}
          />
        </div>

        <div className="ap-field">
          <label className="ap-label">CONTRASEÑA INICIAL</label>
          <input
            className="ap-input"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={set("password")}
          />
        </div>

        <div className="ap-field ap-field--last">
          <label className="ap-label">ROL</label>
          <div className="ap-role-grid">
            {ROLES.map((r) => (
              <button
                key={r.key}
                className={`ap-role-btn ap-role-btn--${r.color} ${
                  form.role === r.key ? "ap-role-btn--active" : ""
                }`}
                onClick={() => setForm((f) => ({ ...f, role: r.key }))}
                type="button"
              >
                <span className="ap-role-name">{r.label}</span>
                <span className="ap-role-desc">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ap-modal-footer">
          <button className="ap-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="ap-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <span className="ap-spin" />}
            {loading ? "CREANDO..." : "CREAR USUARIO"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  /* ── Tema (sincronizado con Orders) ── */
  const [theme, setTheme] = useState(
    () => localStorage.getItem("picking_theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("picking_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  /* ── Carga de usuarios ── */
  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: getHeaders(),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.status === 403) {
        navigate("/orders", { replace: true });
        return;
      }
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreated = (user) => {
    setUsers((prev) => [...prev, user]);
    setShowModal(false);
    setNotice({
      type: "success",
      msg: `Usuario ${user.name} creado correctamente`,
    });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleDeactivate = async (userId, userName) => {
    if (!confirm(`¿Desactivar a ${userName}?`)) return;
    setDeleting(userId);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotice({ type: "success", msg: `${userName} desactivado` });
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ type: "error", msg: "No se pudo desactivar el usuario" });
    } finally {
      setDeleting(null);
    }
  };

  const byRole = ROLES.reduce((acc, r) => {
    acc[r.key] = users.filter((u) => u.role === r.key);
    return acc;
  }, {});

  return (
    <div className="ap-root">
      <div className="ap-bg-grid" />

      {/* ── Header compartido ── */}
      <Layout subtitle="ADMIN" theme={theme} onToggleTheme={toggleTheme}>
        <div className="ap-page">
          {/* ── Page header ── */}
          <header className="ap-header">
            <div>
              <p className="ap-header-eyebrow">PANEL DE ADMINISTRACIÓN</p>
              <h1 className="ap-header-title">USUARIOS</h1>
              <p className="ap-header-sub">
                Creá y gestioná los usuarios de tu empresa
              </p>
            </div>
            <button
              className="ap-btn-primary ap-btn-primary--sm"
              onClick={() => setShowModal(true)}
            >
              <IconPlus /> NUEVO USUARIO
            </button>
          </header>

          {/* ── Notice ── */}
          {notice && (
            <Alert
              type={notice.type}
              msg={notice.msg}
              onClose={() => setNotice(null)}
            />
          )}

          {/* ── Stats ── */}
          <div className="ap-stats">
            {ROLES.map((r) => (
              <div key={r.key} className={`ap-stat ap-stat--${r.color}`}>
                <span className="ap-stat-value">
                  {byRole[r.key]?.length ?? 0}
                </span>
                <span className="ap-stat-label">{r.label.toUpperCase()}S</span>
              </div>
            ))}
          </div>

          {/* ── User table ── */}
          {loading ? (
            <div className="ap-empty">
              <span className="ap-spin ap-spin--lg" />
            </div>
          ) : users.length === 0 ? (
            <div className="ap-empty">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              <p>SIN USUARIOS</p>
              <button
                className="ap-btn-primary"
                onClick={() => setShowModal(true)}
              >
                <IconPlus /> CREAR PRIMER USUARIO
              </button>
            </div>
          ) : (
            <div className="ap-table-wrapper">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>USUARIO</th>
                    <th>EMAIL</th>
                    <th>ROL</th>
                    <th>ESTADO</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => {
                    const color = ROLE_COLOR[user.role] ?? "blue";
                    return (
                      <tr
                        key={user.id}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <td>
                          <div className="ap-user-cell">
                            <div
                              className={`ap-user-avatar ap-user-avatar--${color}`}
                            >
                              {user.name?.[0]?.toUpperCase() ?? "?"}
                            </div>
                            <span className="ap-user-name">{user.name}</span>
                          </div>
                        </td>
                        <td className="ap-cell-mono">{user.email}</td>
                        <td>
                          <span className={`ap-badge ap-badge--${color}`}>
                            {ROLES.find((r) => r.key === user.role)?.label ??
                              user.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`ap-badge ${
                              user.isActive
                                ? "ap-badge--green"
                                : "ap-badge--muted"
                            }`}
                          >
                            {user.isActive ? "ACTIVO" : "INACTIVO"}
                          </span>
                        </td>
                        <td>
                          {user.isActive && (
                            <button
                              className="ap-deactivate-btn"
                              onClick={() =>
                                handleDeactivate(user.id, user.name)
                              }
                              disabled={deleting === user.id}
                              title="Desactivar usuario"
                            >
                              {deleting === user.id ? (
                                <span className="ap-spin" />
                              ) : (
                                <IconTrash />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
      {/* ── Modal ── */}
      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
