// src/components/Header.jsx - REALTIME NOTIFICATIONS (100% WORKING)
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, 
  Calendar, 
  LogOut, 
  User, 
  UserPlus,
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Loader2
} from 'lucide-react';
import { userAPI, getCurrentUser, logout, realtime } from '../utils/api';
import toast from 'react-hot-toast';

export default function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Load user và notifications lần đầu
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);

    if (currentUser) {
      loadNotifications();
    }

    // Lắng nghe sự kiện user updated
    const handleUserUpdate = () => {
      const updatedUser = getCurrentUser();
      setUser(updatedUser);
      if (updatedUser) {
        loadNotifications();
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('user-updated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('user-updated', handleUserUpdate);
    };
  }, []);

  // REALTIME: Lắng nghe thông báo mới từ WebSocket
  const handleNewNotification = useCallback((msg) => {
    if (msg.type !== 'new_notification') return;

    const newNoti = {
      ...msg.data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // 1. Thêm vào đầu danh sách
    setNotifications(prev => [newNoti, ...prev]);
    setUnreadCount(prev => prev + 1);

    // 2. Phát âm thanh
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    // 3. Toast thông báo
    toast.custom((t) => (
      <div className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto ring-4 ring-teal-400 ring-opacity-50 transform transition-all`}>
        <div className="flex p-4 gap-4">
          <div className="flex-shrink-0">
            {newNoti.type === 'success' && <CheckCircle className="w-10 h-10 text-green-500" />}
            {newNoti.type === 'warning' && <AlertCircle className="w-10 h-10 text-orange-500" />}
            {newNoti.type === 'info' && <Info className="w-10 h-10 text-blue-500" />}
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">{newNoti.title}</p>
            <p className="text-gray-600 mt-1">{newNoti.message}</p>
            <p className="text-xs text-gray-500 mt-2">Vừa xong</p>
          </div>
          <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    ), {
      duration: 8000,
      position: 'top-right'
    });
  }, []);

  // REALTIME: Lắng nghe cập nhật đánh dấu đã đọc
  const handleReadUpdate = useCallback((msg) => {
    if (msg.type === 'notification_read') {
      setNotifications(prev =>
        prev.map(n => n.id === msg.notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  // Đăng ký lắng nghe realtime
  useEffect(() => {
    if (!user) return;

    realtime.on('message', handleNewNotification);
    realtime.on('message', handleReadUpdate);

    return () => {
      realtime.off('message', handleNewNotification);
      realtime.off('message', handleReadUpdate);
    };
  }, [user, handleNewNotification, handleReadUpdate]);

  // Load thông báo từ server
  const loadNotifications = async () => {
    if (!getCurrentUser()) return;

    setLoadingNotifications(true);
    try {
      const response = await userAPI.getMyNotifications();
      const data = response.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Lỗi tải thông báo:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mở/đóng popup
  const toggleNotifications = () => {
    setShowNotifications(prev => {
      if (!prev) loadNotifications(); // Load mới khi mở popup
      return !prev;
    });
  };

  // Đánh dấu đã đọc
  const markAsRead = async (notificationId) => {
    try {
      await userAPI.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Gửi thông báo cho các tab khác
      realtime.send({ type: 'notification_read', notificationId });
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead);
      await Promise.all(unread.map(n => userAPI.markNotificationRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      // Gửi thông báo cho các tab khác
      unread.forEach(n => realtime.send({ type: 'notification_read', notificationId: n.id }));
      toast.success('Đã đánh dấu tất cả!');
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả:', err);
      toast.error('Không thể đánh dấu tất cả');
    }
  };

  // Click ngoài để đóng popup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Đăng xuất
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Icon thông báo
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'info':    return <Info className="w-5 h-5 text-blue-500" />;
      default:        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format thời gian
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      <style>{`
        @keyframes enter {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter { animation: enter 0.3s ease-out; }
      `}</style>

      <header className="bg-white border-b-2 border-teal-100 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-teal-700">TVNAdrenaline</h1>
                <p className="text-xs text-gray-500 -mt-1">Hệ thống tiêm chủng</p>
              </div>
            </Link>

            {/* Nav Right */}
            <div className="flex items-center gap-3 lg:gap-5">
              {user ? (
                <>
                  {/* Chuông thông báo REALTIME */}
                  <div className="relative" ref={notificationRef}>
                    <button
                      onClick={toggleNotifications}
                      className="relative p-3 hover:bg-gray-100 rounded-full transition-all duration-200"
                    >
                      <Bell className="w-6 h-6 text-gray-600" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Popup thông báo */}
                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-enter">
                        <div className="p-4 border-b bg-gradient-to-r from-teal-50 to-cyan-50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              <Bell className="w-5 h-5 text-teal-600" />
                              Thông báo
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {unreadCount}
                                </span>
                              )}
                            </h3>
                            <button
                              onClick={() => setShowNotifications(false)}
                              className="p-2 hover:bg-white/50 rounded-full transition"
                            >
                              <X className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline"
                            >
                              Đánh dấu tất cả đã đọc
                            </button>
                          )}
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                          {loadingNotifications ? (
                            <div className="p-10 text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600 mb-3" />
                              <p className="text-gray-500">Đang tải thông báo...</p>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="p-10 text-center">
                              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500">Chưa có thông báo nào</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {notifications.slice(0, 10).map((n) => (
                                <div
                                  key={n.id}
                                  onClick={() => !n.isRead && markAsRead(n.id)}
                                  className={`p-4 transition-all cursor-pointer ${
                                    n.isRead ? 'hover:bg-gray-50' : 'bg-teal-50 hover:bg-teal-100'
                                  }`}
                                >
                                  <div className="flex gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {getNotificationIcon(n.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <h4 className={`font-semibold text-sm ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                          {n.title}
                                        </h4>
                                        {!n.isRead && <span className="w-2 h-2 bg-teal-600 rounded-full mt-1.5 animate-pulse"></span>}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{n.message}</p>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatTime(n.createdAt)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {notifications.length > 0 && (
                          <div className="p-3 bg-gray-50 border-t text-center">
                            <Link
                              to="/notifications"
                              onClick={() => setShowNotifications(false)}
                              className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                            >
                              Xem tất cả thông báo 
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Avatar + Tên */}
                  <Link
                    to="/profile"
                    className="hidden md:flex items-center gap-3 bg-teal-50 hover:bg-teal-100 px-5 py-3 rounded-2xl transition-all hover:shadow-md border border-teal-200"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-teal-800">{user.name.split(' ')[0]}</p>
                      <p className="text-xs text-teal-600">Trang cá nhân</p>
                    </div>
                  </Link>

                  {/* Quản lý lịch */}
                  <Link
                    to="/my-bookings"
                    className="hidden sm:flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-xl hover:bg-teal-700 transition font-medium shadow-lg"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Lịch của tôi</span>
                  </Link>

                  {/* Đăng xuất */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-teal-600 font-semibold hover:text-teal-700 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 transition font-semibold shadow-lg flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}