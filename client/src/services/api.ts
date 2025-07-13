import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Request interceptor to add auth token
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { username: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

export const applicationsAPI = {
  getAll: (params?: any) => api.get('/applications', { params }),
  getById: (id: string) => api.get(`/applications/${id}`),
  create: (data: any) => api.post('/applications', data),
  update: (id: string, data: any) => api.put(`/applications/${id}`, data),
  delete: (id: string) => api.delete(`/applications/${id}`),
  fetchVendorData: (id: string) => api.post(`/applications/${id}/fetch-vendor-data`),
  getStats: () => api.get('/applications/stats/overview'),
  bulkUpdate: (data: { applications: any[]; updates: any }) =>
    api.put('/applications/bulk/update', data),
};

export const uploadAPI = {
  uploadApplications: (file: File, options?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      Object.keys(options).forEach(key => {
        formData.append(key, options[key]);
      });
    }
    return api.post('/upload/applications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getTemplate: () => api.get('/upload/template', { responseType: 'blob' }),
  validateFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const reportsAPI = {
  generateExcel: (data: any) => api.post('/reports/excel', data, { responseType: 'blob' }),
  generatePowerPoint: (data: any) => api.post('/reports/powerpoint', data, { responseType: 'blob' }),
  getTemplates: () => api.get('/reports/templates'),
};

export const vendorPortalsAPI = {
  getAll: () => api.get('/vendor-portals'),
  getById: (id: string) => api.get(`/vendor-portals/${id}`),
  create: (data: any) => api.post('/vendor-portals', data),
  update: (id: string, data: any) => api.put(`/vendor-portals/${id}`, data),
  delete: (id: string) => api.delete(`/vendor-portals/${id}`),
  testConnection: (id: string) => api.post(`/vendor-portals/${id}/test`),
  getStatus: (id: string) => api.get(`/vendor-portals/${id}/status`),
};

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getStatusChart: () => api.get('/dashboard/charts/status'),
  getVendorChart: () => api.get('/dashboard/charts/vendors'),
  getCVEChart: () => api.get('/dashboard/charts/cves'),
  getEOLAlerts: () => api.get('/dashboard/eol-alerts'),
  getSecuritySummary: () => api.get('/dashboard/security-summary'),
};

export default api; 