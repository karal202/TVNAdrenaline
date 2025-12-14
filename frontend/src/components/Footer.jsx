// src/components/Footer.jsx
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Phone, 
  MapPin, 
  Heart, 
  Mail,
  Clock,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ChevronRight,
  Calendar,
  FileText,
  HelpCircle,
  Building
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-teal-900 to-gray-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Cột 1: Về chúng tôi */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">TVNAdrenaline</h3>
                <p className="text-xs text-teal-300">Vaccination System</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Hệ thống đặt lịch tiêm chủng trực tuyến hàng đầu Việt Nam, 
              mang đến dịch vụ chăm sóc sức khỏe tốt nhất cho gia đình bạn.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 hover:bg-teal-600 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 hover:bg-teal-600 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 hover:bg-teal-600 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 hover:bg-teal-600 rounded-lg flex items-center justify-center transition-all hover:scale-110"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div>
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-teal-400" />
              Liên kết nhanh
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link 
                  to="/booking" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Đặt lịch tiêm
                </Link>
              </li>
              <li>
                <Link 
                  to="/my-bookings" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Lịch của tôi
                </Link>
              </li>
              <li>
                <Link 
                  to="/centers" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Cơ sở tiêm chủng
                </Link>
              </li>
              <li>
                <Link 
                  to="/vaccines" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Thông tin vắc-xin
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ */}
          <div>
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              Hỗ trợ
            </h4>
            <ul className="space-y-3">
              <li>
                <Link 
                  to="/faq" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link 
                  to="/guide" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Hướng dẫn sử dụng
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link 
                  to="/privacy" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className="text-gray-300 hover:text-teal-400 transition flex items-center gap-2 group"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Thông tin liên hệ */}
          <div>
            <h4 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Phone className="w-5 h-5 text-teal-400" />
              Liên hệ
            </h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 transition">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Hotline 24/7</p>
                  <a 
                    href="tel:19009999" 
                    className="font-bold text-lg hover:text-teal-400 transition"
                  >
                    1900 9999
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 transition">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <a 
                    href="mailto:support@tvnadrenaline.vn" 
                    className="font-semibold hover:text-teal-400 transition break-all"
                  >
                    support@tvnadrenaline.vn
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 transition">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Giờ làm việc</p>
                  <p className="font-semibold">Thứ 2 - Chủ nhật</p>
                  <p className="text-sm text-gray-300">7:00 - 18:00</p>
                </div>
              </div>

              <div className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-teal-600/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-600 transition">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Trụ sở chính</p>
                  <p className="font-semibold text-sm">
                    123 Nguyễn Huệ, Q.1, TP.HCM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>© {currentYear} TVNAdrenaline.</span>
              <span className="hidden sm:inline">Bản quyền thuộc về</span>
              <span className="font-semibold text-teal-400">TVNAdrenaline Co., Ltd</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500 animate-pulse" />
              <span>in Việt Nam</span>
              <span className="ml-2 px-3 py-1 bg-teal-600/20 rounded-full text-teal-400 font-semibold">
                v1.0.0
              </span>
            </div>
          </div>

          {/* Certifications/Badges (optional) */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Đã xác minh bởi Bộ Y tế</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Giấy phép: 123/GP-BYT</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-500" />
                <span>Hoạt động từ 2020</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}