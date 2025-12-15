// utils/api.js - TVNAdrenaline Frontend API + WebSocket Real-time (FULL + CLEAN)

import axios from 'axios';
import toast from 'react-hot-toast';

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
    this.forceLogoutHandled = false;
  }

  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('✅ WebSocket Connected');
      this.reconnectAttempts = 0;
      this.forceLogoutHandled = false;
      
      // ✅ Gửi token + sessionToken + deviceId xác thực
      const sessionToken = getSessionToken();
      const deviceId = getDeviceId();
      
      this.ws.send(JSON.stringify({
        type: 'auth',
        token,
        sessionToken,
        deviceId
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        // ✅ XỬ LÝ FORCE LOGOUT (bị đẩy ra)
        if (msg.type === 'force_logout' && !this.forceLogoutHandled) {
          this.forceLogoutHandled = true;
          this.handleForceLogout(msg.message);
          return;
        }
        
        this.handleMessage(msg);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('❌ WebSocket Disconnected');
      if (!this.forceLogoutHandled) {
        this.attemptReconnect(token);
      }
    };

    this.ws.onerror = (err) => {
      console.error('❌ WebSocket Error:', err);
    };
  }

  /**
   * ⭐ XỬ LÝ KHI BỊ KICK RA BỞI THIẾT BỊ KHÁC
   */
  handleForceLogout(message) {
    console.warn('🚫 Force logout:', message);
    
    // 1. Clear all auth data
    clearSession();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 2. Ngắt WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // 3. Hiển thị toast thông báo đẹp mắt
    toast.error(
      (t) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-red-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">
                Đã đăng xuất khỏi thiết bị này
              </h3>
              <p className="text-sm text-gray-600">
                {message || 'Tài khoản của bạn đã đăng nhập từ thiết bị khác'}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/login';
              }}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Đăng nhập lại
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/';
              }}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000, // Hiển thị 10 giây
        position: 'top-center',
        style: {
          background: 'white',
          color: '#1f2937',
          padding: '20px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: '500px',
          border: '2px solid #fecaca'
        },
      }
    );
    
    // 4. Redirect về login sau 3 giây
    setTimeout(() => {
      window.location.href = '/login?reason=force_logout';
    }, 3000);
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached');
      return;
    }

    setTimeout(() => {
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.connect(token);
    }, this.reconnectDelay);
  }

  handleMessage(msg) {
    console.log('📨 WebSocket Message:', msg);

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
export { getDeviceId, getSessionToken, saveSession, clearSession };

// ==================== AUTH ====================
export const authAPI = {
  login: async (emailOrPhone, password) => {
    const deviceId = getDeviceId();
    const response = await api.post('/auth/login', {
      emailOrPhone,
      password,
      deviceId,
      userAgent: navigator.userAgent,
      ipAddress: null // Sẽ được backend tự lấy
    });
    
    // Lưu session token
    if (response.data.sessionToken) {
      saveSession(response.data.sessionToken, response.data.expiresAt);
    }
    
    return response;
  },

  register: async (name, phone, email, password) => {
    const deviceId = getDeviceId();
    const response = await api.post('/auth/register', {
      name,
      phone,
      email,
      password,
      deviceId,
      userAgent: navigator.userAgent
    });
    
    // Lưu session token nếu có
    if (response.data.sessionToken) {
      saveSession(response.data.sessionToken, response.data.expiresAt);
    }
    
    return response;
  },

  logout: async () => {
    const sessionToken = getSessionToken();
    const deviceId = getDeviceId();
    
    try {
      await api.post('/auth/logout', { sessionToken, deviceId });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearSession();
      realtime.disconnect();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all');
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      clearSession();
      realtime.disconnect();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  me: () => api.get('/auth/me'),
  
  getMySessions: () => api.get('/my/sessions'),
  
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

export const paymentAPI = {
  createPayment: (bookingId, method) =>
    api.post('/payment/create', { bookingId, method }),
  
  getPaymentStatus: (orderId) =>
    api.get(`/payment/status/${orderId}`),
  
  getPaymentHistory: () =>
    api.get('/payment/history'),
  
  // ✅ THÊM MỚI: Hủy thanh toán và giải phóng slot
  cancelPayment: (bookingId) =>
    api.post('/payment/cancel', { bookingId }),
};

const getDeviceId = () => {
  let deviceId = localStorage.getItem('deviceId');
  
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('deviceId', deviceId);
  }
  
  return deviceId;
};

const saveSession = (sessionToken, expiresAt) => {
  localStorage.setItem('sessionToken', sessionToken);
  localStorage.setItem('sessionExpiresAt', expiresAt);
};

const getSessionToken = () => localStorage.getItem('sessionToken');

const clearSession = () => {
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('sessionExpiresAt');
};



export default api;