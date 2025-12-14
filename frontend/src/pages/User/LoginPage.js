import { useState } from 'react';
import { authAPI } from '../../utils/api'; // ← ĐÚNG file api.js mình đã gửi

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Đăng nhập: backend nhận email hoặc số điện thoại → dùng emailOrPhone
  const [loginData, setLoginData] = useState({
    emailOrPhone: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Xử lý input
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSignupChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
    setError('');
  };

  // ==================== ĐĂNG NHẬP ====================
  const handleLogin = async () => {
    setError('');
    setSuccess('');

    if (!loginData.emailOrPhone || !loginData.password) {
      return setError('Vui lòng nhập email/số điện thoại và mật khẩu');
    }

    setLoading(true);
    try {
      const res = await authAPI.login(loginData.emailOrPhone, loginData.password);

      // Lưu đúng key như api.js yêu cầu
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const role = res.data.user.role;

      setSuccess('Đăng nhập thành công! Đang chuyển về trang chủ...');
      setTimeout(() => {
      if (role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else if (role === 'staff') {
        window.location.href = '/staff/dashboard';
      } else {
        window.location.href = '/';
      }
    }, 1500);
    } catch (err) {
      setError(err.message || 'Sai thông tin đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ĐĂNG KÝ ====================
  const handleSignup = async () => {
    setError('');
    setSuccess('');

    if (!signupData.name || !signupData.phone || !signupData.email || !signupData.password) {
      return setError('Vui lòng điền đầy đủ thông tin');
    }
    if (signupData.password !== signupData.confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }
    if (signupData.password.length < 6) {
      return setError('Mật khẩu phải từ 6 ký tự trở lên');
    }
    // Validate số điện thoại Việt Nam
    const cleanPhone = signupData.phone.replace(/[\s\-\(\)]/g, '');
    if (!/^(0[3|5|7|8|9]|84[3|5|7|8|9])[0-9]{8}$/.test(cleanPhone)) {
      return setError('Số điện thoại không hợp lệ');
    }
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(signupData.email)) {
      return setError('Email không hợp lệ');
    }

    setLoading(true);
    try {
      const res = await authAPI.register(
        signupData.name,
        signupData.phone,
        signupData.email,
        signupData.password
      );

      // Đăng ký thành công → tự động đăng nhập luôn
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      setSuccess('Đăng ký thành công! Chào mừng bạn đến với TVNAdrenaline');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Nhấn Enter để submit
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !loading) action();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 flex items-center justify-center p-4 overflow-hidden">
      {/* CARD CHÍNH */}
      <div className="relative w-full max-w-5xl h-[680px] bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden">

        {/* 2 FORM ĐỨNG YÊN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full z-10 relative">

          {/* === FORM ĐĂNG NHẬP === */}
          <div className="p-8 lg:p-16 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full space-y-8">
              <div className="text-center">
                <h2 className="text-5xl font-bold text-gray-800 mb-3">Chào mừng trở lại!</h2>
                <p className="text-gray-600 text-lg">Đăng nhập để quản lý lịch tiêm cho bé</p>
              </div>

              {error && isLogin && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center">
                  {error}
                </div>
              )}
              {success && isLogin && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-center">
                  {success}
                </div>
              )}

              <div className="space-y-5">
                <input
                  type="text" // đổi thành text để người dùng nhập cả email lẫn sđt
                  name="emailOrPhone"
                  value={loginData.emailOrPhone}
                  onChange={handleLoginChange}
                  onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                  disabled={loading}
                  placeholder="Email hoặc số điện thoại"
                  className="w-full px-6 py-4 text-lg bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-teal-400 focus:border-teal-500 outline-none transition-all"
                />
                <input
                  type="password"
                  name="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                  disabled={loading}
                  placeholder="Mật khẩu"
                  className="w-full px-6 py-4 text-lg bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-teal-400 focus:border-teal-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xl font-bold rounded-2xl hover:shadow-2xl transform hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xl"
              >
                {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
              </button>
            </div>
          </div>

          {/* === FORM ĐĂNG KÝ === */}
          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full space-y-8">
              <div className="text-center">
                <h2 className="text-5xl font-bold text-gray-800 mb-3">Tạo tài khoản mới</h2>
                <p className="text-gray-600 text-lg">Miễn phí 100% – Chỉ 30 giây</p>
              </div>

              {error && !isLogin && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-center">
                  {error}
                </div>
              )}
              {success && !isLogin && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-center">
                  {success}
                </div>
              )}

              <div className="space-y-5">
                <input type="text" name="name" value={signupData.name} onChange={handleSignupChange} disabled={loading}
                  placeholder="Họ và tên" className="w-full px-6 py-4 bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-400 outline-none" />
                <input type="tel" name="phone" value={signupData.phone} onChange={handleSignupChange} disabled={loading}
                  placeholder="Số điện thoại" className="w-full px-6 py-4 bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-400 outline-none" />
                <input type="email" name="email" value={signupData.email} onChange={handleSignupChange} disabled={loading}
                  placeholder="Email" className="w-full px-6 py-4 bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-400 outline-none" />
                <input type="password" name="password" value={signupData.password} onChange={handleSignupChange} disabled={loading}
                  placeholder="Mật khẩu" className="w-full px-6 py-4 bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-400 outline-none" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  onKeyPress={(e) => handleKeyPress(e, handleSignup)}
                  disabled={loading}
                  placeholder="Xác nhận mật khẩu"
                  className="w-full px-6 py-4 bg-white/70 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-cyan-400 outline-none"
                />
              </div>

              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl font-bold rounded-2xl hover:shadow-2xl transform hover:-translate-y-1 transition-all disabled:opacity-70 shadow-xl"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Ngay'}
              </button>
            </div>
          </div>
        </div>

        {/* PANEL TRƯỢT – GIỮ NGUYÊN 100% */}
        <div className={`absolute top-0 left-0 h-full w-full lg:w-1/2 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 
          flex items-center justify-center transition-transform duration-700 ease-in-out 
          ${isLogin ? 'translate-x-full' : 'translate-x-0'}
          rounded-3xl shadow-2xl pointer-events-none z-20`}>

          <div className="text-center text-white px-10 relative z-10">
            {isLogin ? (
              <>
                <h2 className="text-5xl lg:text-6xl font-extrabold mb-6 drop-shadow-2xl">Xin chào!</h2>
                <p className="text-xl lg:text-2xl mb-10 opacity-95 leading-relaxed">
                  Chưa có tài khoản?<br />
                  Đăng ký ngay để đặt lịch tiêm chủng cho bé yêu!
                </p>
                <button
                  onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
                  className="px-12 py-5 bg-white text-cyan-600 text-xl font-bold rounded-full hover:bg-gray-50 transform hover:scale-110 transition-all shadow-2xl pointer-events-auto"
                >
                  Đăng Ký Miễn Phí
                </button>
              </>
            ) : (
              <>
                <h2 className="text-5xl lg:text-6xl font-extrabold mb-6 drop-shadow-2xl">Welcome Back!</h2>
                <p className="text-xl lg:text-2xl mb-10 opacity-95 leading-relaxed">
                  Đã có tài khoản?<br />
                  Đăng nhập để tiếp tục quản lý lịch tiêm
                </p>
                <button
                  onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
                  className="px-12 py-5 bg-white text-teal-600 text-xl font-bold rounded-full hover:bg-gray-50 transform hover:scale-110 transition-all shadow-2xl pointer-events-auto"
                >
                  Đăng Nhập Ngay
                </button>
              </>
            )}
          </div>

          {/* Hiệu ứng bong bóng – giữ nguyên */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute top-10 left-10 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse animation-delay-1000" />
          </div>
        </div>

      </div>
    </div>
  );
}