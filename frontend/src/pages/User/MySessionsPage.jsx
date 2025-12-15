// src/pages/MySessionsPage.js - Quản lý các thiết bị đang đăng nhập

import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Tablet, MapPin, Clock, AlertCircle, LogOut } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function MySessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await authAPI.getMySessions();
      setSessions(res.data);
    } catch (err) {
      toast.error('Không thể tải danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất TẤT CẢ thiết bị? (Bao gồm thiết bị hiện tại)')) {
      return;
    }

    try {
      await authAPI.logoutAll();
      toast.success('Đã đăng xuất tất cả thiết bị');
      
      // Redirect về login sau 1s
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (err) {
      toast.error('Không thể đăng xuất');
    }
  };

  const getDeviceIcon = (userAgent) => {
    const ua = (userAgent || '').toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <Smartphone className="w-6 h-6" />;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet className="w-6 h-6" />;
    }
    return <Monitor className="w-6 h-6" />;
  };

  const getDeviceName = (userAgent) => {
    const ua = (userAgent || '').toLowerCase();
    
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    
    return 'Trình duyệt';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Thiết bị đã đăng nhập
            </h1>
            <p className="text-gray-600">
              Quản lý các thiết bị đang đăng nhập vào tài khoản của bạn
            </p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-2">
                  Bảo mật tài khoản
                </h3>
                <p className="text-yellow-800 text-sm">
                  Hiện tại, hệ thống chỉ cho phép <strong>1 thiết bị</strong> đăng nhập cùng lúc.
                  Nếu bạn đăng nhập từ thiết bị khác, thiết bị hiện tại sẽ tự động bị đăng xuất.
                </p>
              </div>
            </div>
          </div>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <Monitor className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">
                Không có thiết bị nào
              </h3>
              <p className="text-gray-500">
                Hiện tại không có thiết bị nào đang đăng nhập
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition"
                >
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      {getDeviceIcon(session.userAgent)}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {getDeviceName(session.userAgent)}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>IP: {session.ipAddress || 'N/A'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Đăng nhập: {formatDate(session.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Hoạt động: {formatDate(session.lastActiveAt)}</span>
                        </div>
                      </div>

                      {/* Device ID */}
                      <div className="mt-3 text-xs font-mono text-gray-400">
                        ID: {session.deviceId}
                      </div>
                    </div>

                    {/* Current Device Badge */}
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Thiết bị hiện tại
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Logout All Button */}
          {sessions.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLogoutAll}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition shadow-lg hover:shadow-xl"
              >
                <LogOut className="w-5 h-5" />
                Đăng xuất tất cả thiết bị
              </button>
              <p className="text-sm text-gray-500 mt-3">
                Tài khoản sẽ bị đăng xuất khỏi tất cả thiết bị
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}