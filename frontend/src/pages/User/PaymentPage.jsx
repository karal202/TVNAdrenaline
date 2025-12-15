import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CreditCard, Smartphone, Loader2, CheckCircle, 
  AlertCircle, ArrowLeft, Shield, Clock, Calendar,
  Baby, MapPin, Wallet
} from 'lucide-react';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { userAPI, getCurrentUser, isLoggedIn } from '../../utils/api';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();
  
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!isLoggedIn() || !currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(currentUser);
    loadBookingDetails();
  }, [bookingId, navigate]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getMyBookings();
      const foundBooking = res.data.find(b => b.id == bookingId);
      
      if (!foundBooking) {
        toast.error('Không tìm thấy lịch đặt');
        navigate('/my-bookings');
        return;
      }
      
      if (foundBooking.paymentStatus === 'paid') {
        toast.success('Lịch này đã được thanh toán!');
        navigate('/my-bookings');
        return;
      }
      
      setBooking(foundBooking);
    } catch (err) {
      toast.error('Không tải được thông tin đặt lịch');
      navigate('/my-bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (method) => {
    if (!booking || processing) return;
    
    setProcessing(true);
    setSelectedMethod(method);

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/payment/${method}/create`,
        {
          bookingId: booking.id,
          amount: booking.vaccinePrice || 950000
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.payUrl) {
        toast.success('Đang chuyển đến cổng thanh toán...', { duration: 2000 });
        
        setTimeout(() => {
          window.location.href = response.data.payUrl;
        }, 800);
      } else {
        throw new Error('Không nhận được link thanh toán');
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.response?.data?.message || 'Không thể tạo thanh toán. Vui lòng thử lại.');
      setProcessing(false);
      setSelectedMethod(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-teal-600 mx-auto mb-6" />
          <p className="text-xl text-gray-700">Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy lịch đặt</h2>
          <button
            onClick={() => navigate('/my-bookings')}
            className="px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition"
          >
            Quay lại danh sách đặt lịch
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50 pt-20 pb-12">
        {/* Header */}
        <div className="max-w-6xl mx-auto px-6 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium transition mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 bg-teal-100 px-6 py-3 rounded-full mb-6">
              <Shield className="w-6 h-6 text-teal-700" />
              <span className="font-bold text-teal-900">Thanh toán an toàn & bảo mật</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Thanh toán đặt lịch tiêm chủng
            </h1>
            <p className="text-xl text-gray-600">
              Mã đặt lịch: <span className="font-bold text-teal-700">{booking.bookingCode}</span>
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Thông tin đơn hàng */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 text-white">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <Wallet className="w-8 h-8" />
                    Thông tin thanh toán
                  </h3>
                </div>

                <div className="p-8 space-y-6">
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Baby className="w-7 h-7 text-teal-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bé được tiêm</p>
                        <p className="font-bold text-lg text-gray-900">{booking.childName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-7 h-7 text-purple-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vắc-xin</p>
                        <p className="font-bold text-lg text-gray-900">{booking.vaccineName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-7 h-7 text-orange-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Ngày tiêm</p>
                        <p className="font-bold text-lg text-gray-900">
                          {new Date(booking.slotDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-7 h-7 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Giờ tiêm</p>
                        <p className="font-bold text-lg text-gray-900">{booking.slotTime?.slice(0, 5)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-7 h-7 text-pink-700" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cơ sở tiêm</p>
                        <p className="font-bold text-lg text-gray-900">{booking.centerName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t-2 border-dashed border-gray-200 pt-6 mt-8">
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-bold text-gray-700">Tổng cộng</span>
                      <span className="text-4xl font-bold text-teal-600">
                        {formatPrice(booking.vaccinePrice || 950000)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-2xl p-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">
                  Chọn phương thức thanh toán
                </h2>

                <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                  {/* MoMo */}
                  <button
                    onClick={() => handlePayment('momo')}
                    disabled={processing}
                    className={`relative group overflow-hidden rounded-3xl border-4 transition-all duration-300 transform hover:-translate-y-2 ${
                      selectedMethod === 'momo' && processing
                        ? 'border-pink-500 shadow-2xl ring-8 ring-pink-200'
                        : 'border-gray-200 hover:border-pink-400 hover:shadow-2xl'
                    }`}
                  >
                    <div className="p-8 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
                        <Smartphone className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Ví MoMo</h3>
                      <p className="text-gray-600 mb-6">Thanh toán nhanh bằng ví điện tử</p>
                      
                      {processing && selectedMethod === 'momo' ? (
                        <div className="flex items-center justify-center gap-3 text-pink-600">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="font-bold text-lg">Đang chuyển hướng...</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Nhấn để thanh toán</span>
                      )}
                    </div>
                  </button>

                  {/* VNPay */}
                  <button
                    onClick={() => handlePayment('vnpay')}
                    disabled={processing}
                    className={`relative group overflow-hidden rounded-3xl border-4 transition-all duration-300 transform hover:-translate-y-2 ${
                      selectedMethod === 'vnpay' && processing
                        ? 'border-blue-500 shadow-2xl ring-8 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-400 hover:shadow-2xl'
                    }`}
                  >
                    <div className="p-8 text-center">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-xl">
                        <CreditCard className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">VNPay</h3>
                      <p className="text-gray-600 mb-6">Thẻ ATM / Visa / MasterCard</p>
                      
                      {processing && selectedMethod === 'vnpay' ? (
                        <div className="flex items-center justify-center gap-3 text-blue-600">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="font-bold text-lg">Đang chuyển hướng...</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Nhấn để thanh toán</span>
                      )}
                    </div>
                  </button>
                </div>

                <div className="mt-12 p-8 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl border-2 border-teal-200">
                  <div className="flex items-start gap-5">
                    <Shield className="w-10 h-10 text-teal-700 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl font-bold text-teal-900 mb-4">Cam kết bảo mật & an toàn</h4>
                      <ul className="grid md:grid-cols-2 gap-3 text-teal-800 font-medium">
                        <li className="flex items-center gap-2">✓ Mã hóa SSL 256-bit</li>
                        <li className="flex items-center gap-2">✓ Chuẩn PCI DSS quốc tế</li>
                        <li className="flex items-center gap-2">✓ Không lưu thông tin thẻ</li>
                        <li className="flex items-center gap-2">✓ Hoàn tiền nếu có sự cố</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}