// src/pages/User/NotificationsPage.js - REALTIME 100% + SIÊU ĐẸP
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCircle, AlertCircle, Info, Clock, Loader2, ChevronLeft,
  Mail, MailOpen, Filter, Volume2, X, Check
} from 'lucide-react';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { userAPI, getCurrentUser, isLoggedIn, realtime } from '../../utils/api';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all');

  // Load lần đầu
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!isLoggedIn() || !currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(currentUser);
    loadNotifications();
  }, [navigate]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getMyNotifications();
      const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(sorted);
      setFilteredNotifications(sorted);
    } catch (err) {
      toast.error('Không tải được thông báo');
    } finally {
      setLoading(false);
    }
  };

  // REALTIME: HANDLER CHO THÔNG BÁO MỚI (định nghĩa ở top level)
  const handleNewNotification = useCallback((msg) => {
    if (msg.type !== 'new_notification') return;

    const newNoti = {
      ...msg.data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // 1. Thêm lên đầu danh sách
    setNotifications(prev => [newNoti, ...prev]);

    // 2. Phát âm thanh "ting"
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    // 3. Toast cực đẹp + hiệu ứng rung
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

    // 4. Hiệu ứng rung nhẹ trang (nếu đang mở tab này)
    document.body.classList.add('animate-pulse-once');
    setTimeout(() => document.body.classList.remove('animate-pulse-once'), 600);
  }, []);

  // REALTIME: LẮNG NGHE THÔNG BÁO MỚI TỪ SERVER
  useEffect(() => {
    realtime.on('message', handleNewNotification);
    return () => {
      realtime.off('message', handleNewNotification);
    };
  }, [handleNewNotification]);

  // REALTIME: CẬP NHẬT KHI CÓ NGƯỜI ĐÁNH DẤU ĐÃ ĐỌC (nếu nhiều tab)
  useEffect(() => {
    const handleReadUpdate = (msg) => {
      if (msg.type === 'notification_read') {
        setNotifications(prev =>
          prev.map(n => n.id === msg.notificationId ? { ...n, isRead: true } : n)
        );
      }
    };

    realtime.on('message', handleReadUpdate);
    return () => realtime.off('message', handleReadUpdate);
  }, []);

  // Áp dụng bộ lọc
  useEffect(() => {
    let filtered = [...notifications];

    if (filter === 'unread') filtered = filtered.filter(n => !n.isRead);
    if (filter === 'read') filtered = filtered.filter(n => n.isRead);
    if (typeFilter !== 'all') filtered = filtered.filter(n => n.type === typeFilter);

    setFilteredNotifications(filtered);
  }, [filter, typeFilter, notifications]);

  const markAsRead = async (notificationId) => {
    try {
      await userAPI.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );

      // Gửi thông báo realtime cho các tab khác
      realtime.send({ type: 'notification_read', notificationId });
      toast.success('Đã đánh dấu đã đọc!');
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) {
      toast.info('Không có thông báo chưa đọc');
      return;
    }

    try {
      await Promise.all(unreadIds.map(id => userAPI.markNotificationRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      // Gửi realtime cho các tab khác
      unreadIds.forEach(id => realtime.send({ type: 'notification_read', notificationId: id }));
      toast.success('Đã đánh dấu tất cả là đã đọc!');
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả:', err);
      toast.error('Không thể đánh dấu tất cả');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-7 h-7 text-green-600" />;
      case 'warning': return <AlertCircle className="w-7 h-7 text-orange-600" />;
      case 'info': return <Info className="w-7 h-7 text-blue-600" />;
      default: return <Bell className="w-7 h-7 text-gray-600" />;
    }
  };

  const getTypeBadge = (type) => {
    const styles = {
      success: 'bg-green-100 text-green-800 border-green-300',
      warning: 'bg-orange-100 text-orange-800 border-orange-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
      default: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    const labels = { success: 'Thành công', warning: 'Cảnh báo', info: 'Thông tin' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[type] || styles.default}`}>
        {labels[type] || type}
      </span>
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <style>{`
        @keyframes enter {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-enter { animation: enter 0.4s ease-out; }
        @keyframes pulse-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.01); }
        }
        .animate-pulse-once { animation: pulse-once 0.6s ease; }
      `}</style>

      <Header />

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Tiêu đề + quay lại */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Quay lại
          </button>

          <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-3xl p-10 text-white shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center">
                    <Bell className="w-12 h-12" />
                  </div>
                  {unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center animate-bounce shadow-lg">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-5xl font-bold mb-2">Trung tâm thông báo</h1>
                  <p className="text-white/90 text-lg">Tất cả thông tin quan trọng được gửi về đây</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-6xl font-bold mb-2">{notifications.length}</div>
                <p className="text-white/80 text-lg">Tổng thông báo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bộ lọc + hành động */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Filter className="w-6 h-6 text-teal-600" />
              <div className="flex gap-2">
                {['all', 'unread', 'read'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-3 rounded-2xl font-bold transition-all transform hover:scale-105 ${
                      filter === f
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-xl'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' && `Tất cả (${notifications.length})`}
                    {f === 'unread' && `Chưa đọc (${unreadCount})`}
                    {f === 'read' && `Đã đọc (${notifications.length - unreadCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              {['all', 'success', 'warning', 'info'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    typeFilter === t
                      ? 'bg-teal-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t === 'all' ? 'Tất cả loại' : getTypeBadge(t)}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-2xl transition transform hover:-translate-y-1"
              >
                <Check className="w-5 h-5" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        {/* Danh sách thông báo */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-20 h-20 animate-spin text-teal-600 mx-auto mb-6" />
            <p className="text-xl text-gray-600">Đang tải thông báo...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl p-20 text-center">
            <Bell className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-gray-700 mb-3 text-center">
              {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </h3>
            <p className="text-gray-500 text-center max-w-md mx-auto">
              Các thông báo về đặt lịch, nhắc lịch, tiêm thành công sẽ hiện ở đây ngay lập tức!
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredNotifications.map((noti, index) => (
              <div
                key={noti.id}
                className={`bg-white rounded-3xl shadow-xl overflow-hidden border-4 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
                  !noti.isRead ? 'border-teal-500 ring-8 ring-teal-100' : 'border-gray-200'
                } ${index === 0 && !noti.isRead ? 'animate-enter' : ''}`}
              >
                <div className="p-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 relative">
                      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                        {getNotificationIcon(noti.type)}
                      </div>
                      {!noti.isRead && (
                        <div className="w-4 h-4 bg-teal-500 rounded-full absolute -top-1 -right-1 animate-ping"></div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <h3 className={`text-2xl font-bold ${!noti.isRead ? 'text-teal-900' : 'text-gray-800'}`}>
                            {noti.title}
                          </h3>
                          {!noti.isRead && (
                            <span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full ml-3">
                              MỚI
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatTime(noti.createdAt)}
                        </div>
                      </div>

                      <p className="text-lg text-gray-700 leading-relaxed mb-4">
                        {noti.message}
                      </p>

                      <div className="flex items-center justify-between">
                        {getTypeBadge(noti.type)}
                        {!noti.isRead && (
                          <button
                            onClick={() => markAsRead(noti.id)}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl font-bold hover:shadow-lg transition transform hover:scale-105"
                          >
                            <MailOpen className="w-5 h-5" />
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {!noti.isRead && (
                  <div className="h-2 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer thống kê */}
        {filteredNotifications.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-8 text-white shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-5xl font-bold mb-2">{notifications.length}</div>
                <p className="text-white/90 text-lg">Tổng thông báo</p>
              </div>
              <div>
                <div className="text-5xl font-bold mb-2 text-orange-300">{unreadCount}</div>
                <p className="text-white/90 text-lg">Chưa đọc</p>
              </div>
              <div>
                <div className="text-5xl font-bold mb-2 text-green-300">
                  {notifications.length - unreadCount}
                </div>
                <p className="text-white/90 text-lg">Đã đọc</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}