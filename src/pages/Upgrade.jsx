import { useEffect, useState } from "react";
import { logout } from "../utils/auth";
import "./Upgrade.css";

const getSession = () => {
    try {
        const t = localStorage.getItem("app_token");
        return JSON.parse(atob(t.split(".")[1]));
    } catch { return null; }
};

const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 12 4 10" />
    </svg>
);

export default function Upgrade() {
    const session = getSession();
    const [theme, setTheme] = useState(
        () => localStorage.getItem("picking_theme") || "light"
    );

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    return (
        <div className="upg-root">

            <div className="upg-card">
                <p className="upg-eyebrow">DIGITALPACKING</p>
                <h1 className="upg-title">PERÍODO DE PRUEBA<br />FINALIZADO</h1>
                <p className="upg-sub">
                    Hola{session?.name ? `, ${session.name}` : ""}. Tus 7 días de prueba
                    gratuita han concluido. Activa tu plan para seguir operando.
                </p>

                <div className="upg-divider" />

                <div className="upg-features">
                    {[
                        "Gestión de órdenes y picking",
                        "Sincronización con MercadoLibre",
                        "Control de delivery y pagos",
                        "Registro de empaque y trazabilidad",
                        "Múltiples usuarios y roles",
                    ].map((f) => (
                        <div className="upg-feature" key={f}>
                            <span className="upg-feature-icon"><CheckIcon /></span>
                            <span>{f}</span>
                        </div>
                    ))}
                </div>

                <div className="upg-divider" />

                <a
                    className="upg-btn-primary"
                    href="https://wa.me/56995759799?text=Hola, quiero activar mi plan de DigitalPacking"
                    target="_blank"
                    rel="noreferrer"
                >
                    Activar plan →
                </a>

                <button className="upg-btn-logout" onClick={logout}>
                    Cerrar sesión
                </button>
            </div>

        </div>
    );
}