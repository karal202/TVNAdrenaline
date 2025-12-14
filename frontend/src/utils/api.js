// utils/api.js - TVNAdrenaline Frontend API + WebSocket Real-time (FULL + CLEAN)

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// ==================== AXIOS INTERCEPTORS ====================
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = '/login?expired=1';
    }
    const msg = error.response?.data?.message || error.message || 'Lỗi mạng';
    return Promise.reject(new Error(msg));
  }
);

// ==================== WEBSOCKET REAL-TIME ====================
class RealtimeService {
  constructor() {
    this.ws = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 3000;
  }

  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket Connected');
      this.reconnectAttempts = 0;
      // Gửi token xác thực ngay khi kết nối
      this.ws.send(JSON.stringify({ type: 'auth', token }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket Disconnected');
      this.attemptReconnect(token);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    setTimeout(() => {
      console.log(`Reconnecting WebSocket... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect(token);
    }, this.reconnectDelay);
  }

  handleMessage(msg) {
    console.log('WebSocket Message:', msg);

    const handler = this.callbacks[msg.type];
    if (handler) handler(msg);
  }

  on(type, callback) {
    this.callbacks[type] = callback;
  }

  off(type) {
    delete this.callbacks[type];
  }

  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Gửi ping định kỳ để giữ kết nối
  startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  stopPing() {
    if (this.pingInterval) clearInterval(this.pingInterval);
  }

  disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Tạo instance toàn cục
export const realtime = new RealtimeService();

// ==================== AUTH ====================
export const authAPI = {
  login: (emailOrPhone, password) =>
    api.post('/auth/login', { emailOrPhone, password }),

  register: (name, phone, email, password) =>
    api.post('/auth/register', { name, phone, email, password }),

  me: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// ==================== PUBLIC ====================
export const publicAPI = {
  getCenters: () => api.get('/centers'),
  getVaccines: () => api.get('/vaccines'),
  getAvailableSlots: (centerId, date) =>
    api.get('/timeslots/available', { params: { centerId, date } }),
};

// ==================== USER ====================
export const userAPI = {
  getMyBookings: () => api.get('/my/bookings'),

  getAvailableSlots: (centerId, date) =>
    api.get('/timeslots/available', { params: { centerId, date } }),

  reserveSlot: (timeSlotId) =>
    api.post('/timeslots/reserve', { timeSlotId }),

  releaseSlot: (timeSlotId) =>
    api.post('/timeslots/release', { timeSlotId }),

  createBooking: (data) => api.post('/bookings', data),

  cancelBooking: (bookingId) =>
    api.patch(`/bookings/${bookingId}/cancel`),

  getMyNotifications: () => api.get('/my/notifications'),
   markNotificationRead: (id) => api.patch(`/notifications/${id}/read`),

  getBookingQR: (bookingId) => api.get(`/bookings/${bookingId}/qr`),
};

// ==================== STAFF & ADMIN ====================
export const staffAPI = {
  getMe: () => api.get('/staff/me'),

  getBookings: (filters = {}) => api.get('/staff/bookings', { params: filters }),

  checkIn: (bookingId) => api.patch(`/staff/bookings/${bookingId}/checkin`),
  completeInjection: (bookingId, data) =>
  api.post(`/staff/bookings/${bookingId}/complete`, data),

  markNoShow: (bookingId) =>
    api.patch(`/staff/bookings/${bookingId}/no-show`),

  getStats: (date) => api.get('/staff/stats', { params: { date } }),

  search: (q) => api.get('/staff/search', { params: { q } }),

  qrCheckIn: (qrData) => api.post('/staff/qr-checkin', { qrData }),

   sendNotificationToUser: (userId, title, message, type = 'info') => api.post('/staff/send-notification', { userId, title, message, type }),

  getUsers: (search = '') => api.get('/staff/users', { params: { search } }),
};

export const adminAPI = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (userId) => api.patch(`/admin/users/${userId}/toggle-status`),
  
  // Staff
  getStaff: () => api.get('/admin/staff'),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),
  
  // Centers
  getCenters: () => api.get('/admin/centers'),
  createCenter: (data) => api.post('/admin/centers', data),
  updateCenter: (id, data) => api.put(`/admin/centers/${id}`, data),
  deleteCenter: (id) => api.delete(`/admin/centers/${id}`),
  
  // Vaccines
  getVaccines: () => api.get('/admin/vaccines'),
  createVaccine: (data) => api.post('/admin/vaccines', data),
  updateVaccine: (id, data) => api.put(`/admin/vaccines/${id}`, data),
  deleteVaccine: (id) => api.delete(`/admin/vaccines/${id}`),
  
  // Existing
  getAllBookings: (filters = {}) => api.get('/admin/bookings', { params: filters }),
  completeInjection: (bookingId, data) => api.post(`/admin/bookings/${bookingId}/complete`, data),
};

// ==================== AUTH HELPERS ====================
export const saveAuth = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Tự động kết nối WebSocket khi login thành công
  realtime.connect(token);
  realtime.startPing();
};

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const isLoggedIn = () => !!localStorage.getItem('token');

export const hasRole = (roles = []) => {
  const user = getCurrentUser();
  return user && roles.includes(user.role);
};

export const logout = () => {
  realtime.disconnect();
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// ==================== AUTO CONNECT KHI APP KHỞI ĐỘNG ====================
if (isLoggedIn()) {
  const token = localStorage.getItem('token');
  realtime.connect(token);
  realtime.startPing();
}

export default api;