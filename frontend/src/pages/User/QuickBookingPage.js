// src/pages/QuickBookingPage.js - PHIÊN BẢN HOÀN CHỈNH 100% (copy là chạy)

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Calendar, MapPin, Clock, Shield, ChevronRight,
  AlertCircle, CheckCircle, Baby, ChevronLeft, Loader2,
  Phone, DollarSign, Sparkles, Heart
} from 'lucide-react';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { publicAPI, userAPI, getCurrentUser, isLoggedIn, realtime } from '../../utils/api';
import toast from 'react-hot-toast';

// HÀM CHUẨN GIỜ VIỆT NAM (UTC+7)
const getVietnamDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const vietnamOffset = 7 * 60 * 60 * 1000;
  const vietnamTime = new Date(date.getTime() + vietnamOffset);
  return vietnamTime.toISOString().split('T')[0];
};

export default function QuickBookingPage() {
  const navigate = useNavigate();
  const { centerId } = useParams(); // Lấy từ URL: /booking/5

  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reservingSlot, setReservingSlot] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [centers, setCenters] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [form, setForm] = useState({
    childName: '', childBirthDate: '', childGender: 'nam',
    parentName: '', parentPhone: '',
    centerId: '',
    vaccineId: '',
    selectedDate: getVietnamDate(1),
    timeSlotId: '',
    doseNumber: 1,
    notes: ''
  });

  // ==================== LOAD USER & GÁN CENTERID NGAY KHI VÀO TRANG ====================
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!isLoggedIn() || !currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    setUser(currentUser);
    setForm(prev => ({
      ...prev,
      parentName: currentUser.name || '',
      parentPhone: currentUser.phone || '',
      centerId: centerId || ''
    }));

    loadInitialData();
  }, [navigate, centerId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [centersRes, vaccinesRes] = await Promise.all([
        publicAPI.getCenters(),
        publicAPI.getVaccines()
      ]);
      setCenters(centersRes.data || []);
      setVaccines(vaccinesRes.data || []);
    } catch (err) {
      toast.error('Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // ==================== LOAD SLOTS ====================
  const loadTimeSlots = useCallback(async (centerId, date) => {
    if (!centerId || !date) return;
    setLoadingSlots(true);
    try {
      const res = await userAPI.getAvailableSlots(centerId, date);
      setTimeSlots(res.data || []);
    } catch (err) {
      toast.error('Không tải được khung giờ');
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (form.centerId && form.selectedDate) {
      loadTimeSlots(form.centerId, form.selectedDate);
    }
  }, [form.centerId, form.selectedDate, loadTimeSlots]);

  // ==================== WEBSOCKET REALTIME ====================
  const handleRealtime = useCallback((msg) => {
    if (msg.type === 'slots_updated' && msg.centerId == form.centerId && msg.date === form.selectedDate) {
      loadTimeSlots(form.centerId, form.selectedDate);
      toast('Khung giờ vừa được cập nhật!', { icon: 'Refresh' });
    }
    if (msg.type === 'injection_completed') {
      toast.success('Bé đã tiêm xong, chúc bé khỏe!', { icon: 'Heart', duration: 8000 });
    }
  }, [form.centerId, form.selectedDate, loadTimeSlots]);

  useEffect(() => {
    realtime.on('message', handleRealtime);
    return () => realtime.off('message', handleRealtime);
  }, [handleRealtime]);

  // ==================== VALIDATION & NAVIGATION ====================
  const validateStep = () => {
    if (step === 1) {
      if (!form.childName.trim()) return setError('Vui lòng nhập tên bé'), false;
      if (!form.childBirthDate) return setError('Vui lòng chọn ngày sinh bé'), false;
      if (!form.parentName.trim()) return setError('Vui lòng nhập tên phụ huynh'), false;
      if (!form.parentPhone.trim()) return setError('Vui lòng nhập số điện thoại'), false;
      if (!/(84|0[3|5|7|8|9])+([0-9]{8})\b/.test(form.parentPhone.replace(/\s/g, '')))
        return setError('Số điện thoại không hợp lệ'), false;
    }
    if (step === 2) {
      if (!form.vaccineId) return setError('Vui lòng chọn vắc-xin'), false;
    }
    if (step === 3) {
      if (!form.timeSlotId) return setError('Vui lòng chọn khung giờ'), false;
    }
    setError('');
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };
  const prevStep = () => { setStep(s => s - 1); setError(''); };

  // ==================== GIỮ SLOT & SUBMIT ====================
  const handleSlotSelect = async (slotId) => {
    if (reservingSlot || form.timeSlotId === slotId) return;
    setReservingSlot(true);
    try {
      await userAPI.reserveSlot(slotId);
      setForm(prev => ({ ...prev, timeSlotId: slotId }));
      toast.success('Đã giữ khung giờ trong 10 phút!', { icon: 'Lock' });
      loadTimeSlots(form.centerId, form.selectedDate);
    } catch (err) {
      toast.error(err.message || 'Không thể giữ khung giờ này');
    } finally {
      setReservingSlot(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await userAPI.createBooking({
        childName: form.childName.trim(),
        childBirthDate: form.childBirthDate,
        childGender: form.childGender,
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        vaccineId: parseInt(form.vaccineId),
        doseNumber: parseInt(form.doseNumber),
        centerId: parseInt(form.centerId),
        timeSlotId: parseInt(form.timeSlotId),
        notes: form.notes.trim() || undefined
      });
      setSuccess(true);
      toast.success('Đặt lịch thành công!', { duration: 5000 });
      setTimeout(() => navigate('/my-bookings'), 3000);
    } catch (err) {
      toast.error(err.message || 'Đặt lịch thất bại, vui lòng thử lại');
      loadTimeSlots(form.centerId, form.selectedDate); // refresh slot nếu lỗi
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DỮ LIỆU HIỂN THỊ ====================
  const selectedCenter = centers.find(c => c.id == form.centerId);
  const selectedVaccine = vaccines.find(v => v.id == form.vaccineId);
  const selectedSlot = timeSlots.find(s => s.id == form.timeSlotId);

  // ==================== TRƯỜNG HỢP THÀNH CÔNG ====================
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-16 text-center max-w-2xl w-full">
          <CheckCircle className="w-32 h-32 text-green-600 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">Đặt lịch thành công!</h1>
          <p className="text-2xl text-teal-600 font-bold mb-8">
            {selectedSlot && new Date(selectedSlot.slotDate).toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}{' lúc '}{selectedSlot?.slotTime.slice(0,5)}
          </p>
          <p className="text-gray-600">Đang chuyển đến lịch của bạn...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDER CHÍNH ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* HERO + PROGRESS BAR */}
      <div className="bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-medium">Đặt nhanh chỉ 20 giây</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              <br className="md:hidden" /> 📍{selectedCenter?.name || 'cơ sở'}
            </h1>
            <p className="text-white/90 text-lg">An toàn • Nhanh chóng • Miễn phí</p>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-8">
            {[
              { num: 1, label: 'Thông tin' },
              { num: 2, label: 'Vắc-xin' },
              { num: 3, label: 'Ngày giờ' },
              { num: 4, label: 'Xác nhận' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-lg md:text-2xl font-bold transition-all ${
                    step >= s.num
                      ? 'bg-white text-teal-600 shadow-2xl scale-110'
                      : 'bg-white/30 text-white/70'
                  }`}>
                    {step > s.num ? <CheckCircle className="w-6 h-6 md:w-8 md:h-8" /> : s.num}
                  </div>
                  <p className={`text-xs md:text-sm font-medium mt-2 hidden md:block ${step >= s.num ? 'text-yellow-300' : 'text-white/70'}`}>
                    {s.label}
                  </p>
                </div>
                {i < 3 && (
                  <div className={`w-8 md:w-20 h-1 mx-2 ${step > s.num ? 'bg-white' : 'bg-white/30'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN FORM */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3 text-red-700 shadow-lg animate-shake">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10">

          {/* BƯỚC 1: THÔNG TIN BÉ */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Baby className="w-12 h-12 text-teal-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Thông tin bé yêu</h2>
                <p className="text-gray-600">Điền đầy đủ để đặt lịch nhanh hơn</p>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Giống hệt BookingPage */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Họ tên bé <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Nguyễn Văn A" value={form.childName} onChange={e => handleChange('childName', e.target.value)}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày sinh <span className="text-red-500">*</span></label>
                  <input type="date" value={form.childBirthDate} onChange={e => handleChange('childBirthDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Giới tính</label>
                  <select value={form.childGender} onChange={e => handleChange('childGender', e.target.value)}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 outline-none">
                    <option value="nam">Bé trai</option>
                    <option value="nữ">Bé gái</option>
                    <option value="khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mũi thứ</label>
                  <input type="number" min="1" max="10" value={form.doseNumber} onChange={e => handleChange('doseNumber', e.target.value)}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Họ tên phụ huynh <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Nguyễn Thị B" value={form.parentName} onChange={e => handleChange('parentName', e.target.value)}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại <span className="text-red-500">*</span></label>
                  <input type="tel" placeholder="0987654321" value={form.parentPhone} onChange={e => handleChange('parentPhone', e.target.value)}
                    className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none" />
                </div>
              </div>

              <button onClick={nextStep}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition transform hover:-translate-y-1 flex items-center justify-center gap-3">
                Tiếp tục <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}

          {/* BƯỚC 2: CHỌN VẮC-XIN */}
          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <MapPin className="w-12 h-12 text-teal-600" />
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{selectedCenter?.name}</h2>
                    <p className="text-gray-600">{selectedCenter?.address}</p>
                  </div>
                </div>
                <p className="text-lg text-gray-600">Chỉ cần chọn loại vắc-xin bạn muốn tiêm</p>
              </div>

              <div>
                <label className="block text-xl font-bold mb-6 flex items-center gap-2">
                  <Shield className="w-7 h-7 text-teal-600" />
                  Chọn vắc-xin <span className="text-red-500">*</span>
                </label>

                {loading ? (
                  <div className="text-center py-12"><Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600" /></div>
                ) : vaccines.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">Không có vắc-xin nào</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-5">
                    {vaccines.map(v => (
                      <div
                        key={v.id}
                        onClick={() => handleChange('vaccineId', v.id)}
                        className={`group relative overflow-hidden p-6 border-3 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                          form.vaccineId == v.id
                            ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-2xl ring-4 ring-teal-300'
                            : 'border-gray-300 bg-white hover:border-teal-400 hover:shadow-xl'
                        }`}
                      >
                        {form.vaccineId == v.id && (
                          <div className="absolute top-3 right-3 w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        )}

                        <div className="flex items-start gap-4">
                          <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                            form.vaccineId == v.id
                              ? 'bg-gradient-to-br from-teal-600 to-cyan-600'
                              : 'bg-gradient-to-br from-teal-100 to-cyan-100 group-hover:from-teal-200 group-hover:to-cyan-200'
                          }`}>
                            <Shield className={`w-9 h-9 ${form.vaccineId == v.id ? 'text-white' : 'text-teal-600'}`} />
                          </div>
                          <div className="flex-1">
                            <h3 className={`font-bold text-lg ${form.vaccineId == v.id ? 'text-teal-900' : 'text-gray-900'}`}>
                              {v.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">{v.manufacturer}</p>
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold rounded-xl ${
                              form.vaccineId == v.id
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-50 text-teal-700'
                            }`}>
                              <DollarSign className="w-5 h-5" />
                              {Number(v.price).toLocaleString()}đ
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => navigate(-1)}
                  className="flex-1 py-4 border-2 border-gray-300 rounded-2xl font-bold text-lg hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <ChevronLeft className="w-5 h-5" /> Quay lại
                </button>
                <button onClick={nextStep}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition flex items-center justify-center gap-2">
                  Chọn ngày giờ <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          {/* STEP 3: CHỌN NGÀY & GIỜ */}
          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Chọn ngày & giờ tiêm
                </h2>
                {selectedCenter && (
                  <p className="text-xl text-teal-600 font-semibold">
                    📍 {selectedCenter.name}
                  </p>
                )}
              </div>

              {/* CHỌN NGÀY */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-6 border-2 border-teal-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-teal-600" />
                    Chọn ngày tiêm
                  </h3>
                  {form.selectedDate && (
                    <span className="text-teal-600 font-semibold">
                      {new Date(form.selectedDate).toLocaleDateString('vi-VN', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                  )}
                </div>

                 <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                  {Array.from({ length: 14 }, (_, i) => {
                    // Tạo ngày theo giờ local (đã tính UTC+7)
                    const date = new Date();
                    date.setDate(date.getDate() + i + 1); // Bắt đầu từ ngày mai
                    
                    // Lấy dateStr theo format YYYY-MM-DD
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;

                    const isSelected = form.selectedDate === dateStr;
                    const dayOfWeek = date.getDay(); // 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Chủ nhật (0) hoặc Thứ 7 (6)
                    const isTomorrow = i === 0;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => handleChange('selectedDate', dateStr)}
                        disabled={isWeekend}
                        className={`relative p-4 rounded-2xl text-center transition-all ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-2xl scale-110 ring-4 ring-teal-300'
                            : isWeekend
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white hover:bg-teal-50 hover:shadow-lg border-2 border-gray-200 hover:border-teal-400'
                        }`}
                      >
                        {isTomorrow && !isWeekend && (
                          <div className="absolute -top-1 -left-1 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            Mới nhất
                          </div>
                        )}

                        <p className="text-xs font-medium mb-1">
                          {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                        </p>
                        <p className="text-2xl font-bold">
                          {date.getDate()}
                        </p>
                        <p className="text-xs mt-1">
                          {date.toLocaleDateString('vi-VN', { month: 'short' })}
                        </p>

                        {/* Hiệu ứng ngày mai đẹp hơn */}
                        {isTomorrow && !isWeekend && !isSelected && (
                          <div className="absolute inset-0 rounded-2xl ring-4 ring-orange-300 opacity-60 animate-pulse"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KHUNG GIỜ */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-teal-600" />
                  Khung giờ có sẵn
                  {form.selectedDate && (
                    <span className="text-base font-normal text-gray-600">
                      - {new Date(form.selectedDate).toLocaleDateString('vi-VN', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </span>
                  )}
                </h3>

                {!form.selectedDate ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Vui lòng chọn ngày trước</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-600 mb-3" />
                    <p className="text-gray-600">Đang tải khung giờ...</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="text-center py-12 bg-orange-50 rounded-2xl border-2 border-orange-200">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-3" />
                    <p className="text-lg text-orange-700 font-medium">
                      Không có khung giờ trống
                    </p>
                    <p className="text-gray-600 mt-2">Vui lòng chọn ngày khác</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {timeSlots.map(slot => {
                      const isSelected = form.timeSlotId == slot.id;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelect(slot.id)}
                          disabled={reservingSlot}
                          className={`relative p-5 rounded-2xl border-3 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSelected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-2xl ring-4 ring-teal-300 scale-105'
                              : 'border-gray-200 hover:border-teal-400 bg-white hover:shadow-lg'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          )}
                          
                          <Clock className={`w-8 h-8 mx-auto mb-2 transition-colors ${
                            isSelected ? 'text-white' : 'text-teal-600'
                          }`} />
                          <p className="font-bold text-lg">
                            {slot.slotTime.slice(0,5)}
                          </p>
                          <p className={`text-xs mt-1 font-medium transition-colors ${
                            isSelected ? 'text-white/90' : 'text-teal-600'
                          }`}>
                            Còn trống
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* GHI CHÚ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Ví dụ: Bé có dị ứng thuốc gì không, cần chuẩn bị gì đặc biệt..."
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none resize-none"
                  rows="3"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  className="flex-1 py-4 border-2 border-gray-300 rounded-2xl font-bold text-lg hover:bg-gray-50 transition"
                >
                  Quay lại
                </button>
                <button
                  onClick={nextStep}
                  disabled={!form.timeSlotId}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: XÁC NHẬN */}
          {step === 4 && (
            <div className="space-y-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-12 h-12 text-teal-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Xác nhận đặt lịch
                </h2>
                <p className="text-gray-600">Kiểm tra thông tin trước khi xác nhận</p>
              </div>

              {/* SUMMARY CARD */}
              <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-3xl p-8 border-4 border-teal-200 shadow-2xl">
                {/* Thông tin bé */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Baby className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {form.childName}
                  </h3>
                  <p className="text-gray-600 capitalize">
                    {form.childGender} • Sinh {new Date(form.childBirthDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>

                {/* Chi tiết */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border-2 border-transparent hover:border-teal-200 transition">
                    <Shield className="w-10 h-10 text-teal-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Vắc-xin</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedVaccine?.name}
                      </p>
                      <p className="text-teal-600 font-semibold">
                        Mũi thứ {form.doseNumber} • {Number(selectedVaccine?.price).toLocaleString()}đ
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border-2 border-transparent hover:border-teal-200 transition">
                    <Calendar className="w-10 h-10 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Ngày & giờ</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedSlot && new Date(selectedSlot.slotDate).toLocaleDateString('vi-VN', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-blue-600 font-semibold">
                        {selectedSlot?.slotTime.slice(0,5)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border-2 border-transparent hover:border-teal-200 transition">
                    <MapPin className="w-10 h-10 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Cơ sở tiêm</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedCenter?.name}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {selectedCenter?.address}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 flex items-center gap-4 border-2 border-transparent hover:border-teal-200 transition">
                    <Phone className="w-10 h-10 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Liên hệ</p>
                      <p className="text-lg font-bold text-gray-900">
                        {form.parentName}
                      </p>
                      <p className="text-green-600 font-semibold">
                        {form.parentPhone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* GHI CHÚ */}
              {form.notes && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">📝 Ghi chú:</p>
                  <p className="text-gray-600">{form.notes}</p>
                </div>
              )}

              {/* LƯU Ý */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5">
                <p className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Lưu ý quan trọng:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Đến trước 15 phút để làm thủ tục</li>
                  <li>Mang theo sổ tiêm chủng & CMND/CCCD</li>
                  <li>Bé phải khỏe mạnh, không sốt</li>
                  <li>Liên hệ {selectedCenter?.phone} nếu cần hỗ trợ</li>
                </ul>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-4">
                <button
                  onClick={prevStep}
                  disabled={submitting}
                  className="flex-1 py-5 border-2 border-gray-300 rounded-2xl font-bold text-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Sửa lại
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-5 rounded-2xl font-bold text-xl hover:shadow-2xl transition disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Đang đặt lịch...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      XÁC NHẬN ĐẶT LỊCH
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}