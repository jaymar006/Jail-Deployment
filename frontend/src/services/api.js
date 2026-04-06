import axios from 'axios';

const api = axios.create({
  // In deployed builds, prefer explicit env; fallback to same-origin to avoid localhost on mobile/remote clients.
  baseURL: process.env.REACT_APP_API_URL || window.location.origin,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to automatically include Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle expired/invalid auth globally so protected API calls don't fail silently as generic fetch errors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      // Avoid redirect loops while already on auth routes.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const recordVisitorScan = async (visitorId) => {
  try {
    const response = await api.post('/visitors/scan', { visitor_id: visitorId });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
