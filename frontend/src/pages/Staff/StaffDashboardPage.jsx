// src/pages/Staff/StaffDashboardPage.js - FIXED CAMERA + WEBSOCKET VERSION
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, User, Shield, Search, Filter, CheckCircle,
  XCircle, AlertCircle, Loader2, ChevronLeft, Phone, Baby,
  MapPin, Activity, TrendingUp, Users, Package, ClipboardCheck, QrCode, XIcon, History
} from 'lucide-react';

import StaffLayout from '../../layouts/StaffLayout';
import { staffAPI, getCurrentUser, isLoggedIn, hasRole, realtime } from '../../utils/api';
import toast from 'react-hot-toast';
import QRScanner from '../../components/QRScanner';

export default function StaffDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    batchNumber: '',
    expiryDate: '',
    reaction: 'none',
    nextDoseDue: '',
    notes: ''
  });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [recentSuccess, setRecentSuccess] = useState(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  // ==================== LOAD DATA ====================
  const loadData = useCallback(async () => {
    if (!staffInfo) return;

    setLoading(true);
    try {
      const [bookingRes, statsRes] = await Promise.all([
        staffAPI.getBookings({ 
          date: selectedDate, 
          status: filterStatus === 'all' ? undefined : filterStatus 
        }),
        staffAPI.getStats(selectedDate)
      ]);

      setBookings(bookingRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [staffInfo, selectedDate, filterStatus]);

  const handleQRCheckInSuccess = async (booking) => {
    toast.success(`✅ Check-in thành công cho bé ${booking.childName}!`);
    
    setRecentSuccess(booking);

    // Cập nhật lại lịch sử
    const saved = localStorage.getItem('qr_scan_history');
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch (e) {}
    }

    loadData();

    // Tự ẩn thông báo sau 6 giây
    setTimeout(() => {
      setRecentSuccess(null);
    }, 6000);
  };

  // ==================== INIT USER & STAFF INFO ====================
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!isLoggedIn() || !currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    if (!hasRole(['staff', 'admin'])) {
      navigate('/', { replace: true });
      return;
    }
    setUser(currentUser);

    const fetchStaff = async () => {
      try {
        const res = await staffAPI.getMe();
        setStaffInfo(res.data);
      } catch (err) {
        toast.error('Không thể tải thông tin nhân viên');
        navigate('/');
      }
    };
    fetchStaff();
  }, [navigate]);

  useEffect(() => {
    const saved = localStorage.getItem('qr_scan_history');
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Load data khi có staffInfo hoặc thay đổi filter
  useEffect(() => {
    if (staffInfo) loadData();
  }, [staffInfo, loadData]);

  // ==================== WEBSOCKET REAL-TIME - OPTIMISTIC UPDATE ====================
  useEffect(() => {
    if (!staffInfo?.centerId) return;

    const handleMessage = (msg) => {
      console.log('📡 [Staff] WebSocket nhận:', msg);

      switch (msg.type) {
        case 'booking_created':
          if (msg.data?.centerId == staffInfo.centerId) {
            if (msg.data?.slotDate === selectedDate) {
              const newBooking = {
                id: msg.data.bookingId || Date.now(),
                bookingCode: msg.data.bookingCode || 'PENDING',
                childName: msg.data.childName,
                parentName: msg.data.parentName || 'N/A',
                parentPhone: msg.data.parentPhone || 'N/A',
                vaccineName: msg.data.vaccineName || 'N/A',
                doseNumber: msg.data.doseNumber || 1,
                slotDate: msg.data.slotDate,
                slotTime: msg.data.slotTime,
                status: 'pending',
                paymentStatus: 'unpaid',
                createdAt: new Date().toISOString()
              };

              if (filterStatus === 'all' || filterStatus === 'pending') {
                setBookings(prev => [newBooking, ...prev]);
                
                setStats(prev => prev ? {
                  ...prev,
                  total: prev.total + 1,
                  byStatus: prev.byStatus.map(s => 
                    s.status === 'pending' 
                      ? { ...s, count: s.count + 1 }
                      : s
                  )
                } : prev);
              }

              toast.success(`🎉 Lịch mới: ${msg.data.childName} - ${msg.data.slotTime}`, {
                duration: 5000,
              });
            } else {
              toast(`📅 Có lịch mới cho ngày ${msg.data?.slotDate}`, {
                duration: 3000,
                icon: '🔔'
              });
            }
          }
          break;

        case 'checked_in':
          if (msg.centerId == staffInfo.centerId) {
            setBookings(prev => prev.map(b => 
              b.id === msg.bookingId 
                ? { ...b, status: 'confirmed' }
                : b
            ));
            
            setStats(prev => prev ? {
              ...prev,
              byStatus: prev.byStatus.map(s => {
                if (s.status === 'pending') return { ...s, count: Math.max(0, s.count - 1) };
                if (s.status === 'confirmed') return { ...s, count: s.count + 1 };
                return s;
              })
            } : prev);

            toast.success('✅ Khách đã check-in');
          }
          break;

        case 'injection_completed':
          if (msg.centerId == staffInfo.centerId) {
            setBookings(prev => prev.map(b => 
              b.id === msg.bookingId 
                ? { ...b, status: 'completed', paymentStatus: 'paid' }
                : b
            ));

            setStats(prev => prev ? {
              ...prev,
              byStatus: prev.byStatus.map(s => {
                if (s.status === 'confirmed') return { ...s, count: Math.max(0, s.count - 1) };
                if (s.status === 'completed') return { ...s, count: s.count + 1 };
                return s;
              })
            } : prev);

            toast.success('💉 Đã hoàn thành tiêm');
          }
          break;

        case 'marked_no_show':
          if (msg.centerId == staffInfo.centerId) {
            setBookings(prev => prev.map(b => 
              b.id === msg.bookingId 
                ? { ...b, status: 'no_show' }
                : b
            ));

            setStats(prev => prev ? {
              ...prev,
              byStatus: prev.byStatus.map(s => {
                if (s.status === 'pending' || s.status === 'confirmed') {
                  return { ...s, count: Math.max(0, s.count - 1) };
                }
                return s;
              })
            } : prev);

            toast('⚠️ Khách không đến', { icon: '❌' });
          }
          break;

        case 'slots_updated':
          if (msg.centerId == staffInfo.centerId && msg.date === selectedDate) {
            console.log('Slot updated, không reload để giữ UX');
          }
          break;

        case 'booking_cancelled':
          if (msg.centerId == staffInfo.centerId) {
            setBookings(prev => prev.filter(b => b.id !== msg.bookingId));
            
            setStats(prev => prev ? {
              ...prev,
              total: Math.max(0, prev.total - 1)
            } : prev);

            toast('🔴 Có lịch bị hủy', { duration: 3000 });
          }
          break;

        default:
          break;
      }
    };

    realtime.on('message', handleMessage);

    return () => {
      realtime.off('message');
    };
  }, [staffInfo, selectedDate, filterStatus]);

  // ==================== CÁC HÀM XỬ LÝ ====================
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 3) {
      toast.error('Vui lòng nhập ít nhất 3 ký tự');
      return;
    }
    setSearching(true);
    try {
      const res = await staffAPI.search(searchQuery);
      setSearchResults(res.data || []);
      if (res.data?.length === 0) {
        toast('Không tìm thấy kết quả', { icon: '🔍' });
      } else {
        toast.success(`Tìm thấy ${res.data?.length} kết quả`);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    if (!window.confirm('Xác nhận check-in khách hàng này?')) return;
    try {
      await staffAPI.checkIn(bookingId);
      toast.success('✅ Check-in thành công!');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenCompleteModal = (booking) => {
    setSelectedBooking(booking);
    setCompleteForm({
      batchNumber: '',
      expiryDate: '',
      reaction: 'none',
      nextDoseDue: '',
      notes: ''
    });
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    if (!completeForm.batchNumber) {
      toast.error('Vui lòng nhập số lô vắc-xin');
      return;
    }
    try {
      await staffAPI.completeInjection(selectedBooking.id, completeForm);
      toast.success('🎉 Xác nhận tiêm thành công!');
      setShowCompleteModal(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleNoShow = async (bookingId) => {
    if (!window.confirm('Đánh dấu khách không đến? Slot sẽ được giải phóng.')) return;
    try {
      await staffAPI.markNoShow(bookingId);
      toast.success('Đã đánh dấu no-show');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-700 border-blue-300',
      completed: 'bg-green-100 text-green-700 border-green-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300',
      no_show: 'bg-gray-100 text-gray-700 border-gray-300'
    };
    const labels = {
      pending: 'Chờ check-in',
      confirmed: 'Đã check-in',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      no_show: 'Không đến'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (!user || !staffInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffLayout />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Staff Dashboard</h1>
                <div className="flex items-center gap-3 text-xl">
                  <MapPin className="w-6 h-6" />
                  <span className="font-semibold">{staffInfo.centerName}</span>
                </div>
                <p className="text-white/90 mt-1">{staffInfo.centerAddress}</p>
              </div>
              <div className="text-right">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-2">
                  <Shield className="w-12 h-12" />
                </div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-white/80">Nhân viên</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-teal-200">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-10 h-10 text-teal-600" />
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Tổng lịch hẹn</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.byStatus.find(s => s.status === 'completed')?.count || 0}
              </p>
              <p className="text-sm text-gray-600">Đã hoàn thành</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <Activity className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {(stats.byStatus.find(s => s.status === 'pending')?.count || 0) +
                 (stats.byStatus.find(s => s.status === 'confirmed')?.count || 0)}
              </p>
              <p className="text-sm text-gray-600">Đang xử lý</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <Package className="w-10 h-10 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {stats.vaccineUsage?.reduce((sum, v) => sum + v.count, 0) || 0}
              </p>
              <p className="text-sm text-gray-600">Vắc-xin đã dùng</p>
            </div>
          </div>
        )}

        {/* Nút QR Scanner - Nổi bật */}
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl shadow-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <QrCode className="w-10 h-10 text-white" />
              </div>
              <div className="text-white">
                <h3 className="text-xl font-bold mb-1">Check-in nhanh bằng QR</h3>
                <p className="text-white/90">Quét mã QR hoặc tải ảnh từ phụ huynh</p>
              </div>
            </div>
            <button
              onClick={() => setShowQRScanner(true)}
              className="bg-white text-teal-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3"
            >
              <QrCode className="w-6 h-6" />
              Mở máy quét
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tìm kiếm (Mã booking, Tên bé, SĐT)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Nhập ít nhất 3 ký tự..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || searchQuery.length < 3}
                  className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Tìm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Chọn ngày
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-5 h-5 text-gray-500" />
            {['all', 'pending', 'confirmed', 'completed', 'no_show'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  filterStatus === status
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' && 'Tất cả'}
                {status === 'pending' && 'Chờ check-in'}
                {status === 'confirmed' && 'Đã check-in'}
                {status === 'completed' && 'Hoàn thành'}
                {status === 'no_show' && 'Không đến'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Search className="w-6 h-6 text-teal-600" />
                Kết quả tìm kiếm ({searchResults.length})
              </h3>
              <button
                onClick={() => setSearchResults([])}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {searchResults.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCheckIn={handleCheckIn}
                  onComplete={handleOpenCompleteModal}
                  onNoShow={handleNoShow}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bookings List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            Lịch hẹn ngày {new Date(selectedDate).toLocaleDateString('vi-VN')}
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có lịch hẹn</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCheckIn={handleCheckIn}
                  onComplete={handleOpenCompleteModal}
                  onNoShow={handleNoShow}
                  getStatusBadge={getStatusBadge}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* QR Scanner Modal */}
        <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${showQRScanner ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowQRScanner(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <QrCode className="w-8 h-8" />
                    Quét mã QR Check-in
                  </h2>
                  <button onClick={() => setShowQRScanner(false)} className="p-2 hover:bg-white/20 rounded-xl transition">
                    <XCircle className="w-8 h-8" />
                  </button>
                </div>
                <p className="mt-2 opacity-90">Hướng camera vào mã QR của phụ huynh</p>
              </div>
              <div className="relative aspect-video bg-black">
                <QRScanner onClose={() => setShowQRScanner(false)} onSuccess={handleQRCheckInSuccess} />
              </div>
              <div className="p-6 bg-gray-50">
                <div className="flex items-center justify-center gap-4 text-gray-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">Đảm bảo mã QR nằm gọn trong khung hình và đủ sáng</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === FLOATING PANEL: Thành công + Lịch sử (ĐẶT ĐÚNG CHỖ - NGOÀI TẤT CẢ) === */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-4">
          {/* Thông báo thành công */}
          {recentSuccess && (
            <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm border-4 border-green-400 animate-in slide-in-from-bottom">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-gray-800">Check-in thành công!</h4>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="font-semibold flex items-center gap-2">
                      <Baby className="w-4 h-4 text-teal-600" />
                      {recentSuccess.childName}
                    </p>
                    <p className="text-gray-600">Mã: <span className="font-mono font-bold text-teal-700">{recentSuccess.bookingCode}</span></p>
                    {recentSuccess.parentName && recentSuccess.parentName !== 'N/A' && (
                      <p className="text-gray-600">PH: {recentSuccess.parentName}</p>
                    )}
                    {recentSuccess.vaccineName && recentSuccess.vaccineName !== 'N/A' && (
                      <p className="text-gray-600">Vaccine: {recentSuccess.vaccineName}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setRecentSuccess(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <XIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Nút lịch sử + panel */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-4 rounded-2xl shadow-2xl hover:scale-105 transition-all font-bold flex items-center justify-center gap-3"
            >
              <History className="w-6 h-6" />
              Lịch sử quét ({scanHistory.length})
            </button>

            {showHistoryPanel && (
              <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm max-h-96 overflow-y-auto border-2 border-teal-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Lịch sử quét mã</h3>
                  <button onClick={() => setShowHistoryPanel(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                {scanHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Chưa có lịch sử</p>
                ) : (
                  <div className="space-y-3">
                    {scanHistory.slice(0, 15).map((item) => (
                      <div key={item.id} className="p-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg text-sm border border-teal-200">
                        <p className="font-semibold text-gray-800">{item.childName}</p>
                        <p className="text-xs text-gray-600">Mã: <span className="font-mono">{item.bookingCode}</span></p>
                        {item.vaccineName && item.vaccineName !== 'N/A' && (
                          <p className="text-xs text-gray-600">Vaccine: {item.vaccineName}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(item.timestamp).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      {/* Complete Injection Modal */}
      {showCompleteModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <ClipboardCheck className="w-8 h-8 text-teal-600" />
                Xác nhận hoàn thành tiêm
              </h2>

              <div className="bg-teal-50 rounded-2xl p-4 mb-6 border-2 border-teal-200">
                <p className="font-semibold text-lg">Bé: {selectedBooking.childName}</p>
                <p className="text-gray-600">Vắc-xin: {selectedBooking.vaccineName}</p>
                <p className="text-gray-600">Mũi thứ: {selectedBooking.doseNumber}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số lô vắc-xin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={completeForm.batchNumber}
                    onChange={(e) => setCompleteForm({...completeForm, batchNumber: e.target.value})}
                    placeholder="VD: LOT123456"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hạn sử dụng
                  </label>
                  <input
                    type="date"
                    value={completeForm.expiryDate}
                    onChange={(e) => setCompleteForm({...completeForm, expiryDate: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phản ứng sau tiêm
                  </label>
                  <select
                    value={completeForm.reaction}
                    onChange={(e) => setCompleteForm({...completeForm, reaction: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                  >
                    <option value="none">Không có phản ứng</option>
                    <option value="mild">Nhẹ (sốt nhẹ, đau nhẹ)</option>
                    <option value="moderate">Trung bình</option>
                    <option value="severe">Nặng (cần theo dõi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ngày tiêm mũi tiếp theo
                  </label>
                  <input
                    type="date"
                    value={completeForm.nextDoseDue}
                    onChange={(e) => setCompleteForm({...completeForm, nextDoseDue: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ghi chú
                  </label>
                  <textarea
                    value={completeForm.notes}
                    onChange={(e) => setCompleteForm({...completeForm, notes: e.target.value})}
                    placeholder="Ghi chú thêm về quá trình tiêm..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none resize-none"
                    rows="3"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
                >
                  Xác nhận hoàn thành
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal - Luôn mount để camera hoạt động ổn định */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${showQRScanner ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/70"
          onClick={() => setShowQRScanner(false)}
        />
        
        {/* Scanner Container */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <QrCode className="w-8 h-8" />
                  Quét mã QR Check-in
                </h2>
                <button
                  onClick={() => setShowQRScanner(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>
              <p className="mt-2 opacity-90">Hướng camera vào mã QR của phụ huynh</p>
            </div>

            {/* Scanner Area */}
            <div className="relative aspect-video bg-black">
              <QRScanner
                onClose={() => setShowQRScanner(false)}
                onSuccess={handleQRCheckInSuccess}
              />
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50">
              <div className="flex items-center justify-center gap-4 text-gray-600">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Đảm bảo mã QR nằm gọn trong khung hình và đủ sáng</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== BOOKING CARD COMPONENT ====================
function BookingCard({ booking, onCheckIn, onComplete, onNoShow, getStatusBadge }) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-4 hover:border-teal-400 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Baby className="w-6 h-6 text-teal-600" />
            <h4 className="text-lg font-bold">{booking.childName}</h4>
            {getStatusBadge(booking.status)}
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{booking.slotTime?.slice(0,5)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>{booking.vaccineName}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{booking.parentName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <a href={`tel:${booking.parentPhone}`} className="text-teal-600 font-semibold hover:underline">
                {booking.parentPhone}
              </a>
            </div>
          </div>

          <div className="mt-3 px-3 py-2 bg-gray-100 rounded-xl text-sm">
            <span className="font-semibold">Mã: </span>
            <span className="text-teal-600 font-mono">{booking.bookingCode}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {booking.status === 'pending' && (
            <>
              <button
                onClick={() => onCheckIn(booking.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold text-sm whitespace-nowrap"
              >
                ✓ Check-in
              </button>
              <button
                onClick={() => onNoShow(booking.id)}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition font-semibold text-sm whitespace-nowrap"
              >
                No-show
              </button>
            </>
          )}
          {booking.status === 'confirmed' && (
            <>
              <button
                onClick={() => onComplete(booking)}
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-semibold text-sm whitespace-nowrap"
              >
                ✓ Hoàn thành
              </button>
              <button
                onClick={() => onNoShow(booking.id)}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition font-semibold text-sm whitespace-nowrap"
              >
                No-show
              </button>
            </>
          )}
          {booking.status === 'completed' && (
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-semibold text-sm text-center">
              ✓ Đã xong
            </div>
          )}
          {['cancelled', 'no_show'].includes(booking.status) && (
            <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm text-center">
              Đã xử lý
            </div>
          )}
        </div>
      </div>
    </div>
  );
}