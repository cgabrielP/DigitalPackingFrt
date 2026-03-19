import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isTokenValid } from "./utils/auth";

// Páginas
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Orders from "./pages/Orders";
import ScanOrder from "./pages/ScanOrder";
import AuthSuccess from "./pages/AuthSuccess";

import "./App.css";
import AdminPanel from "./pages/AdminPanel";
import OrderHistory from "./pages/OrderHistory";
import AssignDelivery from "./pages/AssignDelivery";
import MyDeliveries from "./pages/MyDeliveries";
import PackingLog from "./pages/PackingLog";
import Register from "./pages/Register";
import SelectPlan from "./pages/SelectPlan";
import ManageSubscription from "./pages/ManageSubscription";

/* ─────────────────────────────────────────
   GUARDS
───────────────────────────────────────── */

function PrivateRoute({ children }) {
  if (!isTokenValid()) {
    localStorage.removeItem("app_token");
    return <Navigate to="/login" replace />;
  }
  try {
    const payload = JSON.parse(
      atob(localStorage.getItem("app_token").split(".")[1])
    );
    if (payload.plan === "TRIAL" && payload.trialEndsAt) {
      if (new Date() > new Date(payload.trialEndsAt)) {
        return <Navigate to="/select-plan" replace />;
      }
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RoleRoute({ children, roles }) {
  if (!isTokenValid()) {
    localStorage.removeItem("app_token");
    return <Navigate to="/login" replace />;
  }
  try {
    const payload = JSON.parse(
      atob(localStorage.getItem("app_token").split(".")[1])
    );
    if (payload.plan === "TRIAL" && payload.trialEndsAt) {
      if (new Date() > new Date(payload.trialEndsAt)) {
        return <Navigate to="/select-plan" replace />;
      }
    }
    if (!roles.includes(payload.role)) {
      return <Navigate to="/orders" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Públicas ── */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/register" element={<Register />} />
        <Route path="/select-plan" element={<SelectPlan />} />

        {/* ── Privadas — cualquier rol autenticado ── */}
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/order-history"
          element={
            <PrivateRoute>
              <OrderHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <PrivateRoute>
              <ScanOrder />
            </PrivateRoute>
          }
        />

        {/* ── Privadas — solo ADMIN ── */}
        <Route
          path="/settings"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <Settings />
            </RoleRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <ManageSubscription />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute roles={["ADMIN"]}>
              <AdminPanel />
            </RoleRoute>
          }
        />
        <Route
          path="/assign-delivery"
          element={
            <RoleRoute roles={["ADMIN", "SUPERVISOR"]}>
              <AssignDelivery />
            </RoleRoute>
          }
        />
        <Route
          path="/packing-log"
          element={
            <RoleRoute roles={["ADMIN", "SUPERVISOR"]}>
              <PackingLog />
            </RoleRoute>
          }
        />
        <Route
          path="/my-deliveries"
          element={
            <RoleRoute roles={["DELIVERY"]}>
              <MyDeliveries />
            </RoleRoute>
          }
        />
        {/* ── Raíz y comodín ── */}
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
