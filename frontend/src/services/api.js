
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api/";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate Axios instance for refreshing tokens.
// This prevents the refresh request from triggering this interceptor.
const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

function clearSession() {
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");

  // Avoid repeatedly redirecting if already on the login page.
  if (window.location.pathname !== "/") {
    window.location.href = "/";
  }
}

// Attach the access token to every API request.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired access tokens.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    // Only refresh tokens for unauthorized responses.
    if (error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Never retry the same request repeatedly.
    if (originalRequest._retry) {
      clearSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = sessionStorage.getItem("refreshToken");

    // If no refresh token exists, the user must log in again.
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

    try {
      // Reuse one refresh request when several API calls fail together.
      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post("token/refresh/", {
            refresh: refreshToken,
          })
          .then((response) => {
            const newAccessToken = response.data.access;

            if (!newAccessToken) {
              throw new Error(
                "The refresh endpoint did not return an access token."
              );
            }

            sessionStorage.setItem("accessToken", newAccessToken);

            // Store a rotated refresh token if the backend returns one.
            if (response.data.refresh) {
              sessionStorage.setItem(
                "refreshToken",
                response.data.refresh
              );
            }

            return newAccessToken;
          })
          .catch((refreshError) => {
            clearSession();
            throw refreshError;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Retry the original request with the refreshed access token.
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default api;
