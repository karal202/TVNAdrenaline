// src/pages/MyBookingsPage.js - Trang lịch sử đặt lịch đầy đủ
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
Calendar, Clock, MapPin, Baby, Syringe, Phone, User,
  CheckCircle, XCircle, AlertCircle, Loader2, Filter,
  ChevronDown, ChevronUp, Download, Print, ArrowLeft,
  Package, Award, FileText, Search, QrCode
} from 'lucide-react';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { 
  getCurrentUser,
  userAPI,
  isLoggedIn
} from '../../utils/api';
import BookingQRCode from '../../components/BookingQRCode';

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showQRModal, setShowQRModal] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate('/login', { replace: true });
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    setUser(currentUser);
    loadBookings();
  }, [navigate]);

  const loadBookings = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await userAPI.getMyBookings();
      const data = res.data || [];
      setBookings(data);
      setFilteredBookings(data);
    } catch (err) {
      setError(err.message || 'Không thể tải lịch đặt');
      setBookings([]);
      setFilteredBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter & Search
  useEffect(() => {
    let result = bookings;

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(b => b.status === filterStatus);
    }

    // Search by child name
    if (searchTerm) {
      result = result.filter(b => 
        b.childName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBookings(result);
  }, [filterStatus, searchTerm, bookings]);

  const handleCancelClick = (booking) => {
    setShowCancelModal(booking);
  };

  const confirmCancel = async () => {
    if (!showCancelModal) return;

    setCancelingId(showCancelModal.id);
    setError('');

    try {
      await userAPI.cancelBooking(showCancelModal.id);
      
      // Reload data
      await loadBookings();
      
      setSuccess('Hủy lịch thành công!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Hủy lịch thất bại');
    } finally {
      setCancelingId(null);
      setShowCancelModal(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'Chờ xác nhận' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle, label: 'Đã xác nhận' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', icon: Award, label: 'Hoàn thành' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Đã hủy' },
      no_show: { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle, label: 'Không đến' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const stats = {
    total: bookings.length,
    upcoming: bookings.filter(b => ['pending', 'confirmed'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 py-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-white">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Lịch sử đặt lịch
          </h1>
          <p className="text-xl opacity-90">Quản lý tất cả lịch tiêm chủng của bạn</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12 -mt-10">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 shadow-lg">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-5 bg-green-50 border-2 border-green-300 rounded-2xl flex items-center gap-3 text-green-700 shadow-lg">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <Package className="w-10 h-10 text-teal-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-teal-600">{stats.total}</p>
            <p className="text-gray-600 text-sm">Tổng số lịch</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <Clock className="w-10 h-10 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
            <p className="text-gray-600 text-sm">Sắp tới</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <Award className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-gray-600 text-sm">Hoàn thành</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <XCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-gray-600 text-sm">Đã hủy</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên bé..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none appearance-none bg-white cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-4" />
            <p className="text-gray-500">Đang tải lịch đặt...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-2xl text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Không tìm thấy lịch đặt phù hợp' 
                : 'Chưa có lịch đặt nào'}
            </p>
            <Link 
              to="/booking" 
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-teal-700 shadow-xl transition"
            >
              <Calendar className="w-5 h-5" />
              Đặt lịch ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => {
              const isExpanded = expandedId === booking.id;
              const canCancel = ['pending', 'confirmed'].includes(booking.status);

              return (
                <div 
                  key={booking.id} 
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Baby className="w-10 h-10 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{booking.childName}</h3>
                          <p className="text-gray-600 capitalize flex items-center gap-2">
                            <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                            {booking.childGender}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>

                    {/* Quick Info Grid */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      {/* Date & Time */}
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <Calendar className="w-8 h-8 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">Ngày tiêm</p>
                          <p className="font-bold text-gray-900">
                            {new Date(booking.slotDate).toLocaleDateString('vi-VN')}
                          </p>
                          <p className="text-sm text-blue-600 font-semibold flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {booking.slotTime.slice(0,5)}
                          </p>
                        </div>
                      </div>

                      {/* Vaccine */}
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                        <Syringe className="w-8 h-8 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">Vắc-xin</p>
                          <p className="font-bold text-gray-900">{booking.vaccineName}</p>
                          <p className="text-sm text-green-600 font-semibold">
                            Mũi {booking.doseNumber}
                          </p>
                        </div>
                      </div>

                      {/* Center */}
                      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl">
                        <MapPin className="w-8 h-8 text-red-600 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">Cơ sở</p>
                          <p className="font-bold text-gray-900 line-clamp-2">
                            {booking.centerName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                      >
                        <FileText className="w-4 h-4" />
                        Chi tiết
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {canCancel && (
                        <button
                          onClick={() => handleCancelClick(booking)}
                          disabled={cancelingId === booking.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-medium transition disabled:opacity-50"
                        >
                          {cancelingId === booking.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Đang hủy...
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              Hủy lịch
                            </>
                          )}
                        </button>
                      )}

                      {['pending', 'confirmed'].includes(booking.status) && (
                        <button
                          onClick={() => setShowQRModal(booking)}
                          className="flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 hover:bg-teal-200 rounded-xl font-medium transition"
                        >
                          <QrCode className="w-4 h-4" />
                          Xem QR
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t-2 border-gray-100 p-6 bg-gray-50">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-600" />
                        Thông tin chi tiết
                      </h4>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Mã đặt lịch</p>
                            <p className="font-mono font-bold text-teal-600 text-lg">{booking.bookingCode}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Ngày sinh bé</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(booking.childBirthDate).toLocaleDateString('vi-VN')}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Phụ huynh</p>
                            <p className="font-semibold text-gray-900">{booking.parentName}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {booking.parentPhone}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Ngày đặt lịch</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(booking.bookingDate).toLocaleString('vi-VN')}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 mb-1">Trạng thái thanh toán</p>
                            <p className="font-semibold text-gray-900 capitalize">{booking.paymentStatus}</p>
                          </div>

                          {booking.notes && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Ghi chú</p>
                              <p className="text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                                {booking.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay về trang chủ
          </Link>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-lg w-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Xác nhận hủy lịch?</h3>
              <div className="bg-red-50 rounded-xl p-4 mb-4">
                <p className="text-gray-700 mb-2">
                  <strong>{showCancelModal.childName}</strong>
                </p>
                <p className="text-gray-600">
                  {new Date(showCancelModal.slotDate).toLocaleDateString('vi-VN')} • {showCancelModal.slotTime.slice(0,5)}
                </p>
              </div>
              <p className="text-gray-600">
                Bạn có chắc chắn muốn hủy lịch tiêm này không?<br />
                <strong className="text-red-600">Hành động này không thể hoàn tác!</strong>
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowCancelModal(null)}
                disabled={cancelingId !== null}
                className="flex-1 py-4 border-2 border-gray-300 rounded-2xl hover:bg-gray-50 transition font-bold text-gray-700 disabled:opacity-50"
              >
                Giữ lại
              </button>
              <button 
                onClick={confirmCancel}
                disabled={cancelingId !== null}
                className="flex-1 bg-red-600 text-white py-4 rounded-2xl hover:bg-red-700 transition font-bold disabled:opacity-70"
              >
                {cancelingId ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Đang hủy...
                  </>
                ) : (
                  'Hủy lịch'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQRModal && (
        <BookingQRCode 
          booking={showQRModal} 
          onClose={() => setShowQRModal(null)} 
        />
      )}
      <Footer />
    </div>
  );
}