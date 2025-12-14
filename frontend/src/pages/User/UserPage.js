// src/pages/UserPage.js - FIXED VERSION với kiểm tra lịch tiêm
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Lock, LogOut, Trash2, AlertCircle, 
  CheckCircle, Edit, Save, X, Loader2, Shield, Calendar, XCircle
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { 
  getCurrentUser, 
  userAPI,
  logout,
  isLoggedIn
} from '../../utils/api';

export default function UserPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

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
    setForm({ name: currentUser.name || '', phone: currentUser.phone || '' });
    
    // Load lịch tiêm sắp tới để check
    loadUpcomingBookings();
  }, [navigate]);

  const loadUpcomingBookings = async () => {
    try {
      const res = await userAPI.getMyBookings();
      const bookings = res.data || [];
      
      // Lọc lịch chưa tới (pending, confirmed)
      const upcoming = bookings.filter(b => 
        ['pending', 'confirmed'].includes(b.status)
      );
      
      setUpcomingBookings(upcoming);
    } catch (err) {
      console.error('Không tải được lịch tiêm:', err);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Vui lòng điền đầy đủ họ tên và số điện thoại');
      return;
    }

    if (!/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(form.phone)) {
      setError('Số điện thoại không hợp lệ');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await userAPI.updateProfile({ 
        name: form.name.trim(), 
        phone: form.phone.trim() 
      });
      
      // Cập nhật localStorage
      const updatedUser = { ...user, name: form.name.trim(), phone: form.phone.trim() };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setUser(updatedUser);
      setSuccess('Cập nhật thông tin thành công!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Kiểm tra lịch tiêm sắp tới
    if (upcomingBookings.length > 0) {
      setError(
        `Không thể xóa tài khoản! Bạn còn ${upcomingBookings.length} lịch tiêm chưa hoàn thành. Vui lòng hủy hoặc hoàn thành các lịch tiêm trước.`
      );
      setShowDeleteModal(false);
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await userAPI.deleteAccount();
      
      // Xóa localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Chuyển về trang chủ
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Không thể xóa tài khoản');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="w-32 h-32 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-20 h-20 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">
            Xin chào, <span className="text-yellow-300">{user.name}!</span>
          </h1>
          <p className="text-xl text-white/90">Quản lý thông tin tài khoản của bạn</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12 -mt-20">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 shadow-lg animate-shake">
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

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Thông tin cá nhân</h2>
                <p className="text-white/80">Quản lý thông tin tài khoản</p>
              </div>
            </div>
            
            {!editing && (
              <button 
                onClick={() => setEditing(true)} 
                className="bg-white text-teal-600 px-6 py-3 rounded-xl hover:bg-white/90 flex items-center gap-2 font-semibold shadow-lg transition transform hover:scale-105"
              >
                <Edit className="w-5 h-5" /> Chỉnh sửa
              </button>
            )}
          </div>

          <div className="p-8">
            {!editing ? (
              /* View Mode */
              <div className="space-y-6">
                {/* Name */}
                <div className="group p-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Họ và tên</p>
                      <p className="text-2xl font-bold text-gray-900">{user.name}</p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Số điện thoại</p>
                      <p className="text-2xl font-bold text-gray-900">{user.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 hover:shadow-lg transition">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                      <p className="text-xl font-bold text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        Email không thể thay đổi
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-8 h-8 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Vai trò</p>
                        <p className="text-xl font-bold text-gray-900 capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-amber-100 rounded-xl">
                      <p className="text-amber-700 font-semibold uppercase text-sm">{user.role}</p>
                    </div>
                  </div>
                </div>

                {/* Upcoming Bookings Warning */}
                {upcomingBookings.length > 0 && (
                  <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-8 h-8 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-red-700 mb-1">
                          Bạn có {upcomingBookings.length} lịch tiêm sắp tới
                        </p>
                        <p className="text-sm text-red-600">
                          Vui lòng hoàn thành hoặc hủy các lịch tiêm trước khi xóa tài khoản
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-6 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Nguyễn Văn A" 
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none text-lg transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="0987654321" 
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none text-lg transition"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => { 
                      setEditing(false); 
                      setForm({name: user.name, phone: user.phone});
                      setError('');
                    }} 
                    className="flex-1 py-4 border-2 border-gray-300 rounded-xl font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Hủy
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={loading} 
                    className="flex-1 bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 disabled:opacity-70 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-8 py-6 border-t-2 border-gray-100">
            <div className="grid md:grid-cols-2 gap-4">
              <button 
                onClick={() => { 
                  logout(); 
                  navigate('/login'); 
                }} 
                className="py-4 bg-gray-200 hover:bg-gray-300 rounded-xl font-bold transition flex items-center justify-center gap-3 text-gray-700 shadow-md hover:shadow-lg"
              >
                <LogOut className="w-5 h-5" /> Đăng xuất
              </button>
              
              <button 
                onClick={() => setShowDeleteModal(true)}
                disabled={upcomingBookings.length > 0}
                className="py-4 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-bold transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Trash2 className="w-5 h-5" /> 
                Xóa tài khoản
              </button>
            </div>

            {upcomingBookings.length > 0 && (
              <p className="text-sm text-red-600 text-center mt-3 font-medium">
                ⚠️ Không thể xóa tài khoản khi còn lịch tiêm chưa hoàn thành
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 max-w-lg w-full animate-in zoom-in duration-300">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-14 h-14 text-red-600" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Xóa tài khoản vĩnh viễn?</h3>
              <div className="space-y-2 text-gray-600">
                <p className="text-lg">
                  Bạn có chắc chắn muốn xóa tài khoản không?
                </p>
                <p className="text-red-600 font-bold text-lg">
                  ⚠️ Hành động này KHÔNG THỂ hoàn tác!
                </p>
                <ul className="text-left bg-red-50 rounded-xl p-4 mt-4 space-y-2">
                  <li className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>Tất cả dữ liệu sẽ bị xóa vĩnh viễn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>Không thể khôi phục tài khoản</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span>Lịch sử tiêm chủng sẽ mất</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-4 border-2 border-gray-300 rounded-2xl hover:bg-gray-50 transition font-bold text-gray-700 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-4 rounded-2xl hover:bg-red-700 transition font-bold shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xóa vĩnh viễn'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}