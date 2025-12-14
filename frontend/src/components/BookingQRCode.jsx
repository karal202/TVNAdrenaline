import { useState, useEffect } from 'react';
import { 
  QrCode, Download, Share2, X, Loader2, 
  CheckCircle, AlertCircle, Calendar, Clock, Baby, RefreshCw
} from 'lucide-react';
import { userAPI } from '../utils/api';

export default function BookingQRCode({ booking, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQRCode();
  }, [booking?.id]);

  const loadQRCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await userAPI.getBookingQR(booking.id);
      setQrData(response.data);
    } catch (err) {
      setError(err.message || 'Lỗi tải QR');
      console.error('QR Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrData?.qrCode) return;
    const link = document.createElement('a');
    link.href = qrData.qrCode;
    link.download = `QR_${booking.bookingCode}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!qrData?.qrCode) return;
    try {
      const res = await fetch(qrData.qrCode);
      const blob = await res.blob();
      const file = new File([blob], `QR_${booking.bookingCode}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mã QR Check-in',
          text: `Cho lịch ${booking.bookingCode}`,
          files: [file]
        });
      } else {
        alert('Không hỗ trợ chia sẻ, dùng tải xuống.');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <QrCode className="w-7 h-7 text-teal-600" />
              <h2 className="text-2xl font-bold">Mã QR Check-in</h2>
            </div>
            <button 
              onClick={onClose}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Booking Info */}
          <div className="mb-6 p-4 bg-teal-50 rounded-xl">
            <p className="font-bold text-lg mb-2">
              {booking.childName} - {booking.bookingCode}
            </p>
            <div className="flex gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(booking.slotDate).toLocaleDateString('vi-VN')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {booking.slotTime?.slice(0, 5)}
              </div>
            </div>
          </div>

          {/* QR Code Content */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-3" />
              <p className="text-gray-600">Đang tải mã QR...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 mb-4">{error}</p>
              <button 
                onClick={loadQRCode} 
                className="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            </div>
          ) : (
            <>
              {/* QR Image */}
              <div className="bg-white p-6 rounded-2xl shadow-inner mb-6">
                <img 
                  src={qrData.qrCode} 
                  alt="QR Code Check-in" 
                  className="w-full max-w-xs mx-auto"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button 
                  onClick={handleDownload} 
                  className="py-3 bg-teal-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  Tải xuống
                </button>
                <button 
                  onClick={handleShare} 
                  className="py-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors font-medium"
                >
                  <Share2 className="w-5 h-5" />
                  Chia sẻ
                </button>
              </div>

              {/* Valid Until */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  <strong>Hiệu lực đến:</strong>{' '}
                  {qrData.validUntil 
                    ? new Date(qrData.validUntil).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Không xác định'}
                </p>
              </div>

              {/* Note */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 text-center">
                  💡 Vui lòng xuất trình mã QR này khi đến trung tâm để check-in nhanh chóng
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}