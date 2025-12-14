// src/components/QRScanner.js - FIXED VACCINE DISPLAY
import { useState, useEffect, useRef } from 'react';
import { 
  Camera, Upload, History, RefreshCw, X
} from 'lucide-react';
import { staffAPI } from '../utils/api';

export default function QRScanner({ onClose, onSuccess }) {
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const jsQRRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    import('jsqr').then(module => {
      jsQRRef.current = module.default;
    });

    const savedHistory = localStorage.getItem('qr_scan_history');
    if (savedHistory) {
      try {
        setScanHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
  }, []);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (selectedCamera && scanning) {
      stopScanner();
      startScanner();
    }
  }, [selectedCamera]);

  const startScanner = async () => {
    if (!videoRef.current || scanning) return;

    try {
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: selectedCamera ? undefined : 'environment'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setScanning(true);

      scannerRef.current = setInterval(() => {
        if (!processing && jsQRRef.current) {
          captureAndDecode();
        }
      }, 300);

    } catch (err) {
      console.error('Camera error:', err);
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      clearInterval(scannerRef.current);
      scannerRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const captureAndDecode = () => {
    if (!videoRef.current || !jsQRRef.current) return;
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQRRef.current(imageData.data, imageData.width, imageData.height);

    if (code) {
      handleQRDetected(code.data);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!jsQRRef.current) {
          setProcessing(false);
          return;
        }

        const code = jsQRRef.current(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleQRDetected(code.data);
        }
        setProcessing(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveToHistory = (bookingData) => {
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      bookingId: bookingData.id,
      bookingCode: bookingData.bookingCode,
      childName: bookingData.childName,
      parentName: bookingData.parentName || 'N/A',
      vaccineName: bookingData.vaccineName || 'N/A',
      slotTime: bookingData.slotTime || 'N/A',
      success: true
    };

    const newHistory = [historyItem, ...scanHistory].slice(0, 20);
    setScanHistory(newHistory);
    localStorage.setItem('qr_scan_history', JSON.stringify(newHistory));
  };

  const handleQRDetected = async (qrString) => {
    if (qrString === lastScannedCode || processing) {
      return;
    }

    setLastScannedCode(qrString);
    setProcessing(true);

    try {
      let qrData;
      try {
        qrData = JSON.parse(qrString);
      } catch {
        throw new Error('Mã QR không hợp lệ');
      }

      const response = await staffAPI.qrCheckIn(qrData);
      const data = response.data;

      saveToHistory(data.booking);
      onSuccess?.(data.booking); // Gửi ra ngoài dashboard

      // Không reset result/error nữa → dashboard sẽ hiển thị
      setProcessing(false);
      setLastScannedCode(''); // Cho phép quét mã mới ngay

    } catch (err) {
      // Lỗi vẫn xử lý nhẹ, không hiện modal lớn
      console.error('Check-in error:', err);
      setProcessing(false);
      setLastScannedCode('');
    }
  };

  const clearHistory = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử?')) {
      setScanHistory([]);
      localStorage.removeItem('qr_scan_history');
    }
  };

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col">
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Khung quét */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            <div className="w-64 h-64 border-4 border-teal-400 rounded-2xl">
              <div className="absolute -top-1 -left-1 w-12 h-12 border-t-8 border-l-8 border-white rounded-tl-3xl"></div>
              <div className="absolute -top-1 -right-1 w-12 h-12 border-t-8 border-r-8 border-white rounded-tr-3xl"></div>
              <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-8 border-l-8 border-white rounded-bl-3xl"></div>
              <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-8 border-r-8 border-white rounded-br-3xl"></div>
            </div>
            {scanning && <div className="absolute inset-0 border-2 border-teal-400 animate-pulse"></div>}
          </div>
        </div>

        {/* Trạng thái nhỏ */}
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
          <div className="inline-block bg-black/70 text-white px-6 py-3 rounded-full text-sm font-medium">
            {processing ? 'Đang xử lý...' : 'Sẵn sàng quét mã QR'}
          </div>
        </div>
      </div>

      {/* Nút dưới cùng */}
      <div className="bg-gray-900 p-4 border-t border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg rounded-lg px-4 py-3 flex items-center justify-center gap-2 hover:scale-105 transition-all font-semibold disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            <span>Tải ảnh QR</span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg rounded-lg px-4 py-3 flex items-center justify-center gap-2 hover:scale-105 transition-all font-semibold"
          >
            <History className="w-5 h-5" />
            <span>Lịch sử</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}