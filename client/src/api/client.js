import axios from "axios";

const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const instituteCode = localStorage.getItem("instituteCode");
  const instituteId = localStorage.getItem("instituteId");
  if (instituteCode) config.headers["X-Institute-UUID"] = instituteCode;
  else if (instituteId) config.headers["X-Institute-UUID"] = instituteId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message || err.message || "Request failed";
    return Promise.reject({ ...err, apiMessage: message, apiErrors: err.response?.data?.errors });
  }
);

export default api;
