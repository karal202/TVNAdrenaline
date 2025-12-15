// src/pages/HomePage.js
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Heart, Calendar, Bell, MapPin, Clock, Phone, Shield, Users, 
  Activity, CheckCircle, AlertCircle 
} from 'lucide-react';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { 
  getCurrentUser,    
  isLoggedIn,
  publicAPI,
  userAPI 
} from '../../utils/api';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {

        const currentUser = getCurrentUser();
        setUser(currentUser);


        if (isLoggedIn()) {
          const [bookingsRes, centersRes] = await Promise.all([
            userAPI.getMyBookings(),           // → /api/my/bookings
            publicAPI.getCenters()             // → /api/centers
          ]);

          setBookings(bookingsRes.data || []);
          setCenters(centersRes.data.slice(0, 6));

          // Nếu bạn thêm route lấy thông báo thì dùng:
          // const notifRes = await userAPI.getMyNotifications?.();
          // setNotifications(notifRes?.data?.filter(n => !n.isRead) || []);
        } else {
          // Chưa login → chỉ lấy danh sách trung tâm
          const centersRes = await publicAPI.getCenters();
          setCenters(centersRes.data.slice(0, 6));
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu trang chủ:', err);
        // Vẫn cố gắng load centers (public)
        try {
          const centersRes = await publicAPI.getCenters();
          setCenters(centersRes.data.slice(0, 6));
        } catch { }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const upcomingBooking = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status))
    .sort((a, b) => new Date(`${a.slotDate} ${a.slotTime}`) - new Date(`${b.slotTime} ${b.slotTime}`))[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* HERO SECTION */}
      <section className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">
                  Đã được hàng ngàn phụ huynh tin dùng
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {user 
                  ? `Xin chào ${user.name.split(' ')[0]}!` 
                  : 'Bảo vệ sức khỏe con bạn ngay hôm nay'
                }
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl">
                {user 
                  ? 'Theo dõi lịch tiêm, nhắc lịch tự động và đặt lịch chỉ trong 30 giây' 
                  : 'Hệ thống đặt lịch tiêm chủng trực tuyến - An toàn, tiện lợi, miễn phí 100%'}
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Link 
                  to={user ? "/booking" : "/login"}
                  className="flex items-center gap-2 bg-teal-600 text-white px-8 py-4 rounded-xl hover:bg-teal-700 transition font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Calendar className="w-5 h-5" />
                  {user ? 'Đặt lịch mới' : 'Đăng ký miễn phí'}
                </Link>
                <a 
                  href="tel:19009999"
                  className="flex items-center gap-2 bg-white text-teal-600 px-8 py-4 rounded-xl hover:bg-gray-50 transition font-semibold text-lg shadow-md border-2 border-teal-200"
                >
                  <Phone className="w-5 h-5" />
                  Hotline: 1900 9999
                </a>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="absolute top-0 right-0 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '1s'}}></div>
              
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 border-2 border-teal-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                    <Heart className="w-8 h-8 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">Lịch tiêm chuẩn Bộ Y tế</h3>
                    <p className="text-sm text-gray-500">Cập nhật mới nhất 2025</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Viêm gan B</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">6 trong 1 (Hexaxim/Infanrix)</span>
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-400">Phế cầu Prevenar 13</span>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THỐNG KÊ (chỉ hiện khi đã login) */}
      {user && (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-100 hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-3xl font-bold text-blue-600">{bookings.length}</span>
                </div>
                <p className="text-gray-600 font-medium">Lịch đã đặt</p>
              </div>

              <div className="bg-orange-50 rounded-2xl p-6 border-2 border-orange-100 hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center border border-orange-200">
                    <Bell className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-3xl font-bold text-orange-600">{notifications.length}</span>
                </div>
                <p className="text-gray-600 font-medium">Thông báo mới</p>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-100 hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center border border-green-200">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-3xl font-bold text-green-600">
                    {bookings.length > 0 ? Math.round((bookings.filter(b => b.status === 'completed').length / bookings.length) * 100) : 0}%
                  </span>
                </div>
                <p className="text-gray-600 font-medium">Hoàn thành lịch tiêm</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LỊCH TIÊM SẮP TỚI */}
      {upcomingBooking && (
        <section className="py-16 bg-gradient-to-r from-teal-500 to-cyan-500">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
                <AlertCircle className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Lịch tiêm sắp tới</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Nhắc nhở lịch tiêm chủng</h3>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
                      <Heart className="w-7 h-7 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-800">Bé {upcomingBooking.childName}</h4>
                      <p className="text-sm text-gray-500">Mũi {upcomingBooking.doseNumber}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-teal-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-800">{upcomingBooking.vaccineName}</p>
                        <p className="text-sm text-gray-500">Mũi thứ {upcomingBooking.doseNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-800">
                          {new Date(upcomingBooking.slotDate).toLocaleDateString('vi-VN', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-500">Lúc {upcomingBooking.slotTime?.slice(0,5)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-800">{upcomingBooking.centerName}</p>
                        <p className="text-sm text-gray-500">{upcomingBooking.centerAddress || upcomingBooking.centerName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:border-l-2 md:border-gray-100 md:pl-6">
                  <div className="bg-teal-50 rounded-2xl p-6 border-2 border-teal-200">
                    <h5 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-teal-600" />
                      Chuẩn bị trước khi đến
                    </h5>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Mang theo sổ tiêm chủng</li>
                      <li>• CMND/CCCD của phụ huynh</li>
                      <li>• Đến trước 15 phút</li>
                      <li>• Bé khỏe mạnh, không sốt</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link to="/my-bookings" className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 transition font-medium shadow-md">
                  <Calendar className="w-4 h-4" /> Xem chi tiết lịch
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DANH SÁCH CƠ SỞ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">Cơ sở tiêm chủng uy tín</h3>
            <p className="text-gray-600">Hệ thống trung tâm đạt chuẩn Bộ Y tế trên toàn quốc</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              ))
            ) : (
              centers.map(center => (
                <div key={center.id} className="bg-white rounded-2xl p-6 hover:shadow-xl transition border-2 border-gray-100 hover:border-teal-200 transform hover:-translate-y-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-800 mb-1">{center.name}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{center.address}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-teal-600" />
                      <span className="font-semibold text-teal-700">{center.phone || '1900 9999'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{center.openHours}</span>
                    </div>
                  </div>
                  <Link 
                    to={`/booking/${center.id}`} 
                    className="w-full bg-teal-50 text-teal-700 py-3 rounded-xl hover:bg-teal-100 transition font-medium text-center border border-teal-200"
                  >
                    Đặt lịch tại đây
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}