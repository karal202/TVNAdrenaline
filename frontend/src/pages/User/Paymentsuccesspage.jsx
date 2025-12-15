// src/pages/PaymentSuccessPage.js - Trang thanh toán thành công
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, Calendar, Loader2 } from 'lucide-react';
import Confetti from 'react-confetti';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Tắt confetti sau 5 giây
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const orderId = searchParams.get('orderId') || searchParams.get('orderid');
  const amount = searchParams.get('amount');

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center px-4">
      {showConfetti && <Confetti />}

      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🎉 Thanh toán thành công!
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi
          </p>

          {/* Order Info */}
          {orderId && (
            <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-6 mb-8">
              <p className="text-sm text-teal-700 mb-2">Mã giao dịch</p>
              <p className="text-2xl font-bold text-teal-900 font-mono">
                {orderId}
              </p>
              {amount && (
                <p className="text-teal-600 mt-3 text-lg">
                  Số tiền: <span className="font-bold">{Number(amount).toLocaleString()}đ</span>
                </p>
              )}
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Bước tiếp theo:
            </h3>
            <ul className="text-blue-700 space-y-2 text-sm">
              <li>✓ Chúng tôi đã gửi xác nhận qua email & SMS</li>
              <li>✓ Vui lòng đến đúng giờ hẹn</li>
              <li>✓ Mang theo CMND/CCCD và sổ tiêm chủng</li>
              <li>✓ Đến trước 15 phút để làm thủ tục</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/my-bookings')}
              className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition"
            >
              Xem lịch đặt
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 border-2 border-gray-300 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}