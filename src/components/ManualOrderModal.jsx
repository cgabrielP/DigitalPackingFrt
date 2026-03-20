import { useState } from "react";
import { apiFetch } from "../utils/auth.js";
import "./ManualOrderModal.css";

const API_URL = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

export default function ManualOrderModal({ onClose, onCreated }) {
  const [buyerNickname, setBuyerNickname] = useState("");
  const [receiverCity, setReceiverCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!buyerNickname.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`${API_URL}/delivery/manual-order`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          buyerNickname: buyerNickname.trim(),
          receiverCity: receiverCity.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error creando orden");

      onCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mom-overlay" onClick={onClose}>
      <div className="mom-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mom-header">
          <h2 className="mom-title">ORDEN MANUAL</h2>
          <button className="mom-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mom-desc">
          Crear una orden simple para asignar directamente a un delivery
        </p>

        <form className="mom-form" onSubmit={handleSubmit}>
          <div className="mom-field">
            <label className="mom-label">NOMBRE / COMPRADOR *</label>
            <input
              className="mom-input"
              type="text"
              value={buyerNickname}
              onChange={(e) => setBuyerNickname(e.target.value)}
              placeholder="Ej: Juan Pérez"
              autoFocus
            />
          </div>

          <div className="mom-field">
            <label className="mom-label">CIUDAD DESTINO</label>
            <input
              className="mom-input"
              type="text"
              value={receiverCity}
              onChange={(e) => setReceiverCity(e.target.value)}
              placeholder="Ej: San Miguel"
            />
          </div>

          {error && (
            <div className="mom-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="mom-actions">
            <button type="button" className="mom-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="mom-btn-create"
              disabled={loading || !buyerNickname.trim()}
            >
              {loading ? <span className="adl-spin" /> : null}
              {loading ? "CREANDO..." : "CREAR Y AGREGAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
