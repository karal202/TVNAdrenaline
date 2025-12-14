// src/pages/StaffSchedulePage.js - Quản lý lịch & khung giờ
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, Users, 
  AlertCircle, CheckCircle, Loader2, Filter, Info
} from 'lucide-react';

import StaffLayout from '../../layouts/StaffLayout';
import { staffAPI, getCurrentUser, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

export default function StaffSchedulePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('week'); // week or month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!isLoggedIn() || !currentUser || !hasRole(['staff', 'admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    setUser(currentUser);

    const fetchStaff = async () => {
      try {
        const res = await staffAPI.getMe();
        setStaffInfo(res.data);
      } catch (err) {
        toast.error('Không thể tải thông tin nhân viên');
        navigate('/');
      }
    };
    fetchStaff();
  }, [navigate]);

  useEffect(() => {
    if (staffInfo) loadSchedule();
  }, [staffInfo, currentDate, viewMode]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const dates = getDatesInView();
      const promises = dates.map(date => 
        staffAPI.getBookings({ date }).catch(() => ({ data: [] }))
      );
      
      const results = await Promise.all(promises);
      const schedule = {};
      
      dates.forEach((date, idx) => {
        schedule[date] = results[idx].data || [];
      });
      
      setScheduleData(schedule);
    } catch (err) {
      toast.error('Lỗi tải lịch: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDatesInView = () => {
    const dates = [];
    
    if (viewMode === 'week') {
      // Lấy ngày hiện tại (local time)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = currentDate.getDate();
      
      // Tạo date object ở local time
      const start = new Date(year, month, day);
      const dayOfWeek = start.getDay(); // 0 = CN, 1 = T2, ...
      
      // Tính ngày Thứ 2 đầu tuần
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(start.getDate() + mondayOffset);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        dates.push(dateStr);
      }
    } else {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dates.push(dateStr);
      }
    }
    
    return dates;
  };

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = async (dateStr) => {
    setSelectedDate(dateStr);
    setLoading(true);
    try {
      const res = await staffAPI.getBookings({ date: dateStr });
      setDayDetail(res.data || []);
    } catch (err) {
      toast.error('Lỗi tải chi tiết: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDateStats = (dateStr) => {
    const bookings = scheduleData[dateStr] || [];
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      completed: bookings.filter(b => b.status === 'completed').length
    };
  };

  const isToday = (dateStr) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const isWeekend = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // CN hoặc T7
  };

  if (!user || !staffInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffLayout />

      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                <Calendar className="w-10 h-10 text-teal-600" />
                Lịch Làm Việc
              </h1>
              <p className="text-gray-600">{staffInfo.centerName}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('week')}
                className={`px-5 py-2 rounded-xl font-semibold transition ${
                  viewMode === 'week'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tuần
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-5 py-2 rounded-xl font-semibold transition ${
                  viewMode === 'month'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tháng
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl">
            <button
              onClick={handlePrevious}
              className="p-3 bg-white rounded-xl hover:bg-gray-100 transition shadow"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {viewMode === 'week' 
                  ? `Tuần ${Math.ceil((currentDate.getDate() + new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()) / 7)}`
                  : MONTHS[currentDate.getMonth()]
                }
              </h2>
              <p className="text-gray-600">
                {viewMode === 'week'
                  ? `${getDatesInView()[0]} - ${getDatesInView()[6]}`
                  : `Năm ${currentDate.getFullYear()}`
                }
              </p>
            </div>

            <button
              onClick={handleNext}
              className="p-3 bg-white rounded-xl hover:bg-gray-100 transition shadow"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex justify-center mb-6">
            <button
              onClick={handleToday}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-semibold"
            >
              Hôm nay
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mb-6 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
            <Info className="w-5 h-5 text-blue-600" />
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-400"></div>
                <span>Chờ check-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-400"></div>
                <span>Đã check-in</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-400"></div>
                <span>Hoàn thành</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-300"></div>
                <span>Cuối tuần</span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600">Đang tải lịch...</p>
            </div>
          ) : (
            <>
              {viewMode === 'week' ? (
                <div className="grid grid-cols-7 gap-3">
                  {getDatesInView().map((dateStr, idx) => {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    const stats = getDateStats(dateStr);
                    const weekend = isWeekend(dateStr);
                    const today = isToday(dateStr);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => !weekend && handleDateClick(dateStr)}
                        className={`rounded-2xl p-4 min-h-[150px] transition cursor-pointer ${
                          weekend
                            ? 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
                            : today
                            ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-4 border-teal-400 shadow-lg'
                            : 'bg-white border-2 border-gray-200 hover:border-teal-400 hover:shadow-lg'
                        }`}
                      >
                        <div className="text-center mb-3">
                          <p className="text-xs text-gray-500 font-medium">
                            {WEEKDAYS[date.getDay()]}
                          </p>
                          <p className={`text-2xl font-bold ${today ? 'text-teal-600' : 'text-gray-900'}`}>
                            {date.getDate()}
                          </p>
                        </div>

                        {!weekend && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Tổng:</span>
                              <span className="font-bold text-gray-900">{stats.total}</span>
                            </div>
                            {stats.pending > 0 && (
                              <div className="flex items-center gap-2 text-xs bg-yellow-100 px-2 py-1 rounded">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span>{stats.pending} chờ</span>
                              </div>
                            )}
                            {stats.confirmed > 0 && (
                              <div className="flex items-center gap-2 text-xs bg-blue-100 px-2 py-1 rounded">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span>{stats.confirmed} đến</span>
                              </div>
                            )}
                            {stats.completed > 0 && (
                              <div className="flex items-center gap-2 text-xs bg-green-100 px-2 py-1 rounded">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>{stats.completed} xong</span>
                              </div>
                            )}
                          </div>
                        )}

                        {weekend && (
                          <p className="text-xs text-gray-400 text-center">Nghỉ</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {/* Header */}
                  {WEEKDAYS.map(day => (
                    <div key={day} className="text-center font-bold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}

                  {/* Fill first week - tính offset đúng */}
                  {(() => {
                    const year = currentDate.getFullYear();
                    const month = currentDate.getMonth();
                    const firstDayOfMonth = new Date(year, month, 1);
                    let firstDayWeekday = firstDayOfMonth.getDay(); // 0 = CN
                    
                    // Chuyển CN (0) thành 7, còn lại giữ nguyên
                    if (firstDayWeekday === 0) firstDayWeekday = 7;
                    
                    // Offset từ T2 (1-based): nếu tháng bắt đầu T2 thì offset = 0
                    const offset = firstDayWeekday - 1;
                    
                    return Array.from({ length: offset }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square"></div>
                    ));
                  })()}

                  {/* Days */}
                  {getDatesInView().map(dateStr => {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    const stats = getDateStats(dateStr);
                    const weekend = isWeekend(dateStr);
                    const today = isToday(dateStr);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => !weekend && handleDateClick(dateStr)}
                        className={`aspect-square rounded-xl p-2 transition cursor-pointer ${
                          weekend
                            ? 'bg-gray-100 border border-gray-200 cursor-not-allowed'
                            : today
                            ? 'bg-teal-100 border-2 border-teal-500 shadow-lg'
                            : stats.total > 0
                            ? 'bg-blue-50 border border-blue-200 hover:border-teal-400 hover:shadow-md'
                            : 'bg-white border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-sm font-bold text-center mb-1 ${today ? 'text-teal-600' : 'text-gray-700'}`}>
                          {date.getDate()}
                        </p>
                        {!weekend && stats.total > 0 && (
                          <div className="text-center">
                            <p className="text-xs font-semibold text-teal-600">{stats.total} lịch</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Day Detail Modal */}
          {selectedDate && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">
                        {(() => {
                          const [year, month, day] = selectedDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('vi-VN', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          });
                        })()}
                      </h2>
                      <p className="text-gray-600">
                        {dayDetail?.length || 0} lịch hẹn
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="text-gray-400 hover:text-gray-600 text-3xl"
                    >
                      ×
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto" />
                    </div>
                  ) : !dayDetail || dayDetail.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Không có lịch hẹn</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dayDetail
                        .sort((a, b) => a.slotTime.localeCompare(b.slotTime))
                        .map(booking => (
                          <div
                            key={booking.id}
                            className="border-2 border-gray-200 rounded-2xl p-4 hover:border-teal-400 transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Clock className="w-5 h-5 text-teal-600" />
                                  <span className="text-xl font-bold">{booking.slotTime?.slice(0,5)}</span>
                                  <StatusBadge status={booking.status} />
                                </div>
                                <p className="font-semibold text-lg">{booking.childName}</p>
                                <p className="text-sm text-gray-600">{booking.vaccineName}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedDate(null);
                                  navigate('/staff/dashboard');
                                }}
                                className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition text-sm font-semibold"
                              >
                                Xem chi tiết
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const badges = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Chờ' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đã đến' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Xong' },
  };
  
  const badge = badges[status] || badges.pending;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
}