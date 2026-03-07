// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Orders from "./pages/Orders";
import AuthSuccess from "./pages/AuthSuccess";
import Login from "./pages/Login";
import "./App.css";
import { isTokenValid } from "./utils/auth";
import ScanOrder from "./pages/ScanOrder";
import AuthFlow from "./pages/AuthFlow";

function PrivateRoute({ children }) {
  if (!isTokenValid()) {
    localStorage.removeItem("app_token");
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthFlow />} />
        <Route path="/settings/accounts" element={<AuthFlow />} />
        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <Orders />
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
        {/* Ruta raíz: si tiene token va al dashboard, si no al login */}
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
