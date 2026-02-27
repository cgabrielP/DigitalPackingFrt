const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("app_token")}`,
});

export const getMyMLUser = () =>
  fetch(`${API_URL}/auth/ml/user`, { headers: getHeaders() }).then(r => r.json());