import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000/api",
});

// Attach token ke setiap request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Auto-logout jika token expired (401)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token kadaluarsa atau tidak valid
      localStorage.removeItem("token");
      localStorage.removeItem("user_name");
      // Redirect ke login
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default API;