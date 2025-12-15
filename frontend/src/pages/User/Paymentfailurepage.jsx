// src/pages/PaymentFailurePage.js - Trang thanh toán thất bại
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, MessageCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function PaymentFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [cancelling, setCancelling] = useState(false);

  const errorMessage = searchParams.get('message') || 'Giao dịch không thành công';
  const bookingId = searchParams.get('bookingId');

  // ✅ TỰ ĐỘNG HỦY THANH TOÁN VÀ GIẢI PHÓNG SLOT KHI VÀO TRANG NÀY
  useEffect(() => {
    if (bookingId) {
      handleCancelPayment();
    }
  }, [bookingId]);

  const handleCancelPayment = async () => {
    setCancelling(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/payment/cancel`,
        { bookingId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Đã giải phóng slot tự động');
    } catch (err) {
      console.error('Lỗi hủy thanh toán:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Error Icon */}
          <div className="relative inline-flex mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
              <XCircle className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Thanh toán thất bại
          </h1>

          {cancelling ? (
            <div className="flex items-center justify-center gap-2 text-teal-600 mb-8">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-lg">Đang giải phóng slot...</p>
            </div>
          ) : (
            <>
              <p className="text-xl text-gray-600 mb-8">
                Đã có lỗi xảy ra trong quá trình thanh toán
              </p>
            </>
          )}

          {/* Error Message */}
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-8">
            <p className="text-sm text-red-700 mb-2">Lý do:</p>
            <p className="text-lg font-semibold text-red-900">
              {errorMessage}
            </p>
          </div>

          {/* Common Issues */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-yellow-900 mb-3">
              Các nguyên nhân thường gặp:
            </h3>
            <ul className="text-yellow-700 space-y-2 text-sm">
              <li>• Số dư tài khoản không đủ</li>
              <li>• Thông tin thẻ không chính xác</li>
              <li>• Hết hạn mức giao dịch</li>
              <li>• Bạn đã hủy giao dịch</li>
              <li>• Lỗi kết nối mạng</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {bookingId && (
              <button
                onClick={() => navigate(`/payment/${bookingId}`)}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Thử lại thanh toán
              </button>
            )}

            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full border-2 border-gray-300 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Quay lại lịch đặt
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full text-gray-600 hover:text-gray-900 font-medium transition py-2"
            >
              Về trang chủ
            </button>
          </div>

          {/* Support */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-600 mb-3">Cần hỗ trợ?</p>
            <a
              href="tel:1900000000"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold"
            >
              <MessageCircle className="w-5 h-5" />
              Hotline: 1900 0000
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}