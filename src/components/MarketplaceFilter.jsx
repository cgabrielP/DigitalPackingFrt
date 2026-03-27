import { useState, useEffect, useRef } from "react";
import MarketplaceBadge from "./MarketplaceBadge";

const OPTIONS = [
  { key: "all",          label: "Todos" },
  { key: "MERCADOLIBRE", label: "Mercado Libre" },
  { key: "FALABELLA",    label: "Falabella" },
];

const MarketplaceFilter = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value);
  const ref = useRef(null);

  // Sync pending when external value changes
  useEffect(() => { setPending(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasValue = value !== "all";
  const selected = OPTIONS.find((o) => o.key === value);

  const handleApply = () => {
    onChange(pending);
    setOpen(false);
  };

  return (
    <div className="orders-dropdown-wrap mp-filter-wrap" ref={ref}>
      <button
        className={`orders-dropdown-btn ${hasValue ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        {hasValue ? (
          <MarketplaceBadge marketplace={value} />
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
        )}
        <span className="orders-dropdown-label">
          {hasValue ? selected?.label : "MARKETPLACE"}
        </span>
        {hasValue && (
          <span
            className="orders-dropdown-clear"
            onClick={(e) => { e.stopPropagation(); onChange("all"); }}
          >
            ×
          </span>
        )}
        <svg
          className={`orders-dropdown-chevron ${open ? "open" : ""}`}
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="orders-dropdown-menu mp-filter-menu">
          <div className="orders-dropdown-list">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                className={`orders-dropdown-item ${pending === opt.key ? "selected" : ""}`}
                onClick={() => setPending(opt.key)}
              >
                <span className="mp-filter-option">
                  {opt.key !== "all" && <MarketplaceBadge marketplace={opt.key} />}
                  <span className="orders-dropdown-item-label">{opt.label}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mp-filter-actions">
            <button className="mp-filter-apply" onClick={handleApply}>
              APLICAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceFilter;
