// ============================================================================
// API CLIENT - Axios Configuration for Backend
// ============================================================================

import axios from 'axios';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for session
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const authStore = localStorage.getItem('auth-storage');
    if (authStore) {
      try {
        const { state } = JSON.parse(authStore);
        const token = state?.token;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error parsing auth token:', error);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Return the response data directly
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 due to permission/role change (jwtVersion mismatch), force re-login
    if (
      error.response?.status === 401 &&
      error.response?.data?.error?.code === 'JWT_VERSION_MISMATCH'
    ) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login?reason=permissions-changed';
      return Promise.reject(error);
    }

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const authStore = localStorage.getItem('auth-storage');
        if (authStore) {
          const { state } = JSON.parse(authStore);
          const refreshToken = state?.refreshToken;

          if (refreshToken) {
            const response = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              { refreshToken }
            );

            if (response.data.success) {
              const newToken = response.data.data.token;

              // Update token in localStorage
              const updatedState = {
                ...state,
                token: newToken,
              };
              localStorage.setItem(
                'auth-storage',
                JSON.stringify({ state: updatedState, version: 0 })
              );

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // If refresh fails, logout user
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For other errors, just reject
    return Promise.reject(error);
  }
);

export default apiClient;
