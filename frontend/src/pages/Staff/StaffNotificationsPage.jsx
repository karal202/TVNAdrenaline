// src/pages/StaffNotificationsPage.js - Có chức năng gửi tin nhắn
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellRing, Check, ChevronLeft, 
  Loader2, Calendar, AlertCircle, Info,
  CheckCircle, Filter, RefreshCw, Send, X, Search, User
} from 'lucide-react';

import StaffLayout from '../../layouts/StaffLayout';
import { userAPI, staffAPI, getCurrentUser, isLoggedIn, hasRole, realtime } from '../../utils/api';
import toast from 'react-hot-toast';

export default function StaffNotificationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Modal gửi tin nhắn
  const [showSendModal, setShowSendModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sendForm, setSendForm] = useState({
    title: '',
    message: '',
    type: 'info'
  });
  const [sending, setSending] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!isLoggedIn() || !currentUser || !hasRole(['staff', 'admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getMyNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      toast.error('Lỗi tải thông báo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load danh sách users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await staffAPI.getUsers(searchUser);
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Lỗi tải danh sách user: ' + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (showSendModal) {
      loadUsers();
    }
  }, [showSendModal, searchUser]);

  // Real-time notification handler
  const handleRealtimeNotification = useCallback((msg) => {
    if (msg.type === 'new_notification') {
      setNotifications(prev => [msg.data, ...prev]);
      toast.success('Có thông báo mới!', { icon: '🔔' });
    }
  }, []);

  useEffect(() => {
    realtime.on('message', handleRealtimeNotification);
    return () => realtime.off('message');
  }, [handleRealtimeNotification]);

  const handleMarkAsRead = async (id) => {
    try {
      await userAPI.markNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      toast.success('Đã đánh dấu đọc');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await Promise.all(unreadIds.map(id => userAPI.markNotificationRead(id)));
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Xử lý gửi tin nhắn
  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error('Vui lòng chọn người nhận');
      return;
    }
    
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }
    
    setSending(true);
    try {
      await staffAPI.sendNotificationToUser(
        selectedUser.id,
        sendForm.title,
        sendForm.message,
        sendForm.type
      );
      
      toast.success(`Đã gửi thông báo đến ${selectedUser.name}!`);
      
      // Reset form
      setSendForm({ title: '', message: '', type: 'info' });
      setSelectedUser(null);
      setShowSendModal(false);
    } catch (err) {
      toast.error('Lỗi gửi thông báo: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchReadStatus = 
      filter === 'all' ? true :
      filter === 'unread' ? !n.isRead :
      filter === 'read' ? n.isRead : true;
    
    const matchType = typeFilter === 'all' || n.type === typeFilter;
    
    return matchReadStatus && matchType;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'warning': return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case 'reminder': return <Bell className="w-6 h-6 text-blue-600" />;
      default: return <Info className="w-6 h-6 text-teal-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'from-green-50 to-emerald-50 border-green-200';
      case 'warning': return 'from-orange-50 to-amber-50 border-orange-200';
      case 'reminder': return 'from-blue-50 to-indigo-50 border-blue-200';
      default: return 'from-teal-50 to-cyan-50 border-teal-200';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffLayout />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                <BellRing className="w-10 h-10 text-teal-600" />
                Thông Báo
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã đọc'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSendModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Gửi tin nhắn
              </button>
              
              <button
                onClick={loadNotifications}
                className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                title="Làm mới"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold flex items-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Đánh dấu tất cả
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-4 border-2 border-teal-200">
              <p className="text-sm text-gray-600 mb-1">Tổng</p>
              <p className="text-3xl font-bold text-teal-600">{notifications.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Chưa đọc</p>
              <p className="text-3xl font-bold text-blue-600">{unreadCount}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
              <p className="text-sm text-gray-600 mb-1">Đã đọc</p>
              <p className="text-3xl font-bold text-green-600">
                {notifications.length - unreadCount}
              </p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border-2 border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Hôm nay</p>
              <p className="text-3xl font-bold text-orange-600">
                {notifications.filter(n => {
                  const today = new Date().toDateString();
                  const nDate = new Date(n.createdAt).toDateString();
                  return today === nDate;
                }).length}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 p-6 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-gray-700">Lọc theo:</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Trạng thái đọc
                </label>
                <div className="flex gap-2">
                  {['all', 'unread', 'read'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 px-4 py-2 rounded-xl font-semibold transition ${
                        filter === f
                          ? 'bg-teal-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'unread' ? 'Chưa đọc' : 'Đã đọc'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loại thông báo
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="info">Thông tin</option>
                  <option value="reminder">Nhắc nhở</option>
                  <option value="success">Thành công</option>
                  <option value="warning">Cảnh báo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600">Đang tải thông báo...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có thông báo nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  className={`rounded-2xl p-5 border-2 transition ${
                    notification.isRead
                      ? 'bg-white border-gray-200'
                      : `bg-gradient-to-r ${getNotificationColor(notification.type)} shadow-lg`
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      notification.isRead ? 'bg-gray-100' : 'bg-white shadow-md'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className={`text-lg font-bold ${
                          notification.isRead ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.isRead && (
                          <div className="w-3 h-3 rounded-full bg-teal-500 flex-shrink-0 mt-1 animate-pulse"></div>
                        )}
                      </div>

                      <p className={`mb-3 ${
                        notification.isRead ? 'text-gray-600' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(notification.createdAt).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition text-sm font-semibold flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Đánh dấu đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal gửi tin nhắn */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Gửi Tin Nhắn</h2>
                </div>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSendNotification} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Chọn người nhận */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Người nhận <span className="text-red-500">*</span>
                </label>
                
                {/* Search box */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, số điện thoại..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                  />
                </div>

                {/* User list */}
                <div className="border-2 border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto" />
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Không tìm thấy user nào</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map(u => (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`p-3 rounded-xl cursor-pointer transition ${
                            selectedUser?.id === u.id
                              ? 'bg-teal-50 border-2 border-teal-500'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-teal-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800">{u.name}</p>
                              <p className="text-sm text-gray-500">{u.phone}</p>
                            </div>
                            {selectedUser?.id === u.id && (
                              <CheckCircle className="w-6 h-6 text-teal-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div className="mt-3 p-3 bg-teal-50 rounded-xl border-2 border-teal-200">
                    <p className="text-sm font-semibold text-teal-800">
                      Đã chọn: {selectedUser.name} ({selectedUser.phone})
                    </p>
                  </div>
                )}
              </div>

              {/* Loại thông báo */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Loại thông báo
                </label>
                <select
                  value={sendForm.type}
                  onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                >
                  <option value="info">Thông tin</option>
                  <option value="success">Thành công</option>
                  <option value="warning">Cảnh báo</option>
                  <option value="reminder">Nhắc nhở</option>
                </select>
              </div>

              {/* Tiêu đề */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                  required
                />
              </div>

              {/* Nội dung */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  placeholder="Nhập nội dung tin nhắn..."
                  rows="5"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none resize-none"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sending || !selectedUser}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Gửi ngay
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}