// src/pages/DashboardPage.js - FIXED VERSION
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, MapPin, User, Phone, Shield, 
  CheckCircle, XCircle, AlertCircle, Plus, FileText,
  Baby, Syringe, Bell, ArrowRight, Loader2
} from 'lucide-react';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { 
  getCurrentUser,
  userAPI,
  isLoggedIn
} from '../../utils/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [error, setError] = useState('');

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
      
      // Data trả về có structure: { id, childName, vaccineName, centerName, slotDate, slotTime, ... }
      setBookings(data);
    } catch (err) {
      console.error('Lỗi tải lịch:', err);
      setError(err.message || 'Không thể tải lịch đặt');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = (bookingId) => {
    setShowCancelModal(bookingId);
  };

  const confirmCancel = async () => {
    if (!showCancelModal) return;
    
    setCancelingId(showCancelModal);
    setError('');

    try {
      await userAPI.cancelBooking(showCancelModal);
      
      // Cập nhật local state
      setBookings(prev => prev.map(b => 
        b.id === showCancelModal 
          ? { ...b, status: 'cancelled' } 
          : b
      ));
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setError(err.message || 'Hủy lịch thất bại');
    } finally {
      setCancelingId(null);
      setShowCancelModal(null);
    }
  };

  // Filter bookings
  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-600 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Chào mừng trở lại, <span className="text-yellow-300">{user.name.split(' ')[0]}!</span>
          </h1>
          <p className="text-xl opacity-90">Quản lý toàn bộ lịch tiêm chủng của bé yêu</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 shadow-lg">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {showSuccess && (
          <div className="mb-6 p-5 bg-green-100 border-2 border-green-300 rounded-2xl flex items-center gap-3 text-green-800 shadow-lg">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">Hủy lịch thành công!</p>
              <p>Bạn có thể đặt lại lịch mới bất kỳ lúc nào</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition">
            <Calendar className="w-12 h-12 text-teal-600 mx-auto mb-3" />
            <p className="text-4xl font-bold text-teal-600">{upcoming.length}</p>
            <p className="text-gray-600 mt-1 font-medium">Lịch sắp tới</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-4xl font-bold text-green-600">{completed.length}</p>
            <p className="text-gray-600 mt-1 font-medium">Đã tiêm</p>
          </div>
          <div className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition">
            <XCircle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
            <p className="text-4xl font-bold text-orange-600">{cancelled.length}</p>
            <p className="text-gray-600 mt-1 font-medium">Đã hủy</p>
          </div>
          <Link 
            to="/booking" 
            className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-center text-white shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1"
          >
            <Plus className="w-12 h-12 mx-auto mb-3" />
            <p className="font-bold text-lg">Đặt lịch mới</p>
          </Link>
        </div>

        {/* Upcoming Bookings */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-teal-600" />
            Lịch tiêm sắp tới
          </h2>

          {loading ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-4" />
              <p className="text-gray-500">Đang tải lịch...</p>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
              <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-2xl text-gray-500 mb-6">Chưa có lịch tiêm nào sắp tới</p>
              <Link 
                to="/booking" 
                className="inline-flex items-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-teal-700 shadow-xl transition"
              >
                <Plus className="w-5 h-5" />
                Đặt lịch ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {upcoming.map(booking => (
                <div 
                  key={booking.id} 
                  className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-l-8 border-teal-500 hover:shadow-2xl transition"
                >
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Child Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Baby className="w-10 h-10 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{booking.childName}</h3>
                        <p className="text-gray-600 capitalize">{booking.childGender}</p>
                        <p className="text-lg font-semibold mt-2 flex items-center gap-2 text-teal-600">
                          <Syringe className="w-5 h-5" />
                          {booking.vaccineName}
                        </p>
                        <p className="text-sm text-gray-500">Mũi thứ {booking.doseNumber}</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="text-center md:border-l md:border-r border-gray-200 px-4">
                      <p className="text-5xl font-bold text-teal-600 mb-1">
                        {new Date(booking.slotDate).getDate()}
                      </p>
                      <p className="text-lg text-gray-800 mb-2">
                        {new Date(booking.slotDate).toLocaleDateString('vi-VN', { 
                          weekday: 'long', 
                          month: 'long' 
                        })}
                      </p>
                      <p className="text-xl font-bold text-teal-600 flex items-center justify-center gap-2">
                        <Clock className="w-5 h-5" /> 
                        {booking.slotTime.slice(0,5)}
                      </p>
                    </div>

                    {/* Center & Actions */}
                    <div className="space-y-4">
                      <div>
                        <p className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-1">
                          <MapPin className="w-5 h-5 text-red-600" />
                          {booking.centerName}
                        </p>
                        <p className="text-sm text-gray-600 ml-7">
                          {booking.centerAddress || 'Địa chỉ không có'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleCancelClick(booking.id)}
                        disabled={cancelingId === booking.id}
                        className="w-full bg-red-100 text-red-700 px-4 py-3 rounded-xl hover:bg-red-200 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-lg w-full">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">Xác nhận hủy lịch?</h3>
                <p className="text-gray-600 text-lg">
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
                  Giữ lại lịch
                </button>
                <button 
                  onClick={confirmCancel}
                  disabled={cancelingId !== null}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl hover:bg-red-700 transition font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {cancelingId ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang hủy...
                    </>
                  ) : (
                    'Có, hủy lịch'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}