import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false,
});

// Attach token automatically
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem("token");
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
  },
  (error) => Promise.reject(error)
);

// Global error handling — no alert() so UI doesn't freeze
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error("Server not reachable ❌");
      return Promise.reject(error);
    }

    const { status } = error.response;
    console.error("❌ API ERROR:", status, error.response.data);

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;