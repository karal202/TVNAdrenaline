// src/pages/StaffReportsPage.js - Báo cáo & Thống kê
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, Calendar, Shield, Users, 
  DollarSign, ChevronLeft, Loader2, Download, Filter
} from 'lucide-react';

import StaffLayout from '../../layouts/StaffLayout';
import { staffAPI, getCurrentUser, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function StaffReportsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('day'); // day, week, month
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);

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
    if (staffInfo) loadReport();
  }, [staffInfo, reportType, selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let dateFilter = {};
      const today = new Date(selectedDate);
      
      if (reportType === 'day') {
        dateFilter.date = selectedDate;
      } else if (reportType === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        dateFilter.dateFrom = weekStart.toISOString().split('T')[0];
        dateFilter.dateTo = selectedDate;
      } else if (reportType === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFilter.dateFrom = monthStart.toISOString().split('T')[0];
        dateFilter.dateTo = selectedDate;
      }

      const [statsRes, bookingsRes] = await Promise.all([
        staffAPI.getStats(dateFilter.date || selectedDate),
        staffAPI.getBookings({ status: 'completed' })
      ]);

      setStats(statsRes.data);
      
      // Lọc bookings theo reportType
      let filtered = bookingsRes.data || [];
      if (reportType === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        filtered = filtered.filter(b => {
          const bDate = new Date(b.slotDate);
          return bDate >= weekStart && bDate <= today;
        });
      } else if (reportType === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(b => {
          const bDate = new Date(b.slotDate);
          return bDate >= monthStart && bDate <= today;
        });
      } else {
        filtered = filtered.filter(b => b.slotDate === selectedDate);
      }
      
      setBookings(filtered);
    } catch (err) {
      toast.error('Lỗi tải báo cáo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.vaccinePrice) || 0), 0);
  const avgPerPatient = bookings.length > 0 ? totalRevenue / bookings.length : 0;

  const vaccineStats = {};
  bookings.forEach(b => {
    if (!vaccineStats[b.vaccineName]) {
      vaccineStats[b.vaccineName] = { count: 0, revenue: 0 };
    }
    vaccineStats[b.vaccineName].count++;
    vaccineStats[b.vaccineName].revenue += Number(b.vaccinePrice) || 0;
  });

  const handleExportReport = () => {
    const reportData = [
      `Báo cáo ${reportType === 'day' ? 'ngày' : reportType === 'week' ? 'tuần' : 'tháng'}: ${selectedDate}`,
      `Trung tâm: ${staffInfo?.centerName}`,
      '',
      'Tổng quan:',
      `Tổng số khách: ${bookings.length}`,
      `Doanh thu: ${totalRevenue.toLocaleString()}đ`,
      `Trung bình/khách: ${Math.round(avgPerPatient).toLocaleString()}đ`,
      '',
      'Chi tiết theo vắc-xin:',
      'Tên vắc-xin,Số lượng,Doanh thu',
      ...Object.entries(vaccineStats).map(([name, data]) => 
        `${name},${data.count},${data.revenue.toLocaleString()}đ`
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + reportData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-${reportType}-${selectedDate}.csv`;
    link.click();
    toast.success('Đã xuất báo cáo');
  };

  if (!user || !staffInfo) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffLayout />

      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                <BarChart3 className="w-10 h-10 text-teal-600" />
                Báo Cáo & Thống Kê
              </h1>
              <p className="text-gray-600">{staffInfo.centerName}</p>
            </div>

            <button
              onClick={handleExportReport}
              disabled={bookings.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50 font-semibold"
            >
              <Download className="w-5 h-5" />
              Xuất Báo Cáo
            </button>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4 mb-8 p-6 bg-gray-50 rounded-2xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loại báo cáo
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
              >
                <option value="day">Theo ngày</option>
                <option value="week">Theo tuần</option>
                <option value="month">Theo tháng</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {reportType === 'day' ? 'Chọn ngày' : reportType === 'week' ? 'Tuần đến ngày' : 'Tháng đến ngày'}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadReport}
                className="w-full px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Lọc
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600">Đang tải báo cáo...</p>
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <StatCard
                  icon={<Users className="w-10 h-10 text-blue-600" />}
                  label="Tổng khách hàng"
                  value={bookings.length}
                  color="blue"
                />
                <StatCard
                  icon={<DollarSign className="w-10 h-10 text-green-600" />}
                  label="Doanh thu"
                  value={`${totalRevenue.toLocaleString()}đ`}
                  color="green"
                />
                <StatCard
                  icon={<TrendingUp className="w-10 h-10 text-orange-600" />}
                  label="TB/Khách"
                  value={`${Math.round(avgPerPatient).toLocaleString()}đ`}
                  color="orange"
                />
                <StatCard
                  icon={<Shield className="w-10 h-10 text-purple-600" />}
                  label="Loại vắc-xin"
                  value={Object.keys(vaccineStats).length}
                  color="purple"
                />
              </div>

              {/* Vaccine Stats Table */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-teal-600" />
                  Chi Tiết Theo Vắc-xin
                </h2>
                
                {Object.keys(vaccineStats).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có dữ liệu trong khoảng thời gian này
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-teal-50">
                          <th className="px-6 py-4 text-left font-bold text-teal-900 border-b-2 border-teal-200">
                            Tên Vắc-xin
                          </th>
                          <th className="px-6 py-4 text-center font-bold text-teal-900 border-b-2 border-teal-200">
                            Số Lượng
                          </th>
                          <th className="px-6 py-4 text-right font-bold text-teal-900 border-b-2 border-teal-200">
                            Doanh Thu
                          </th>
                          <th className="px-6 py-4 text-center font-bold text-teal-900 border-b-2 border-teal-200">
                            % Tổng
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(vaccineStats)
                          .sort((a, b) => b[1].count - a[1].count)
                          .map(([name, data], idx) => (
                            <tr 
                              key={name}
                              className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-teal-50 transition`}
                            >
                              <td className="px-6 py-4 border-b border-gray-200 font-semibold">
                                {name}
                              </td>
                              <td className="px-6 py-4 border-b border-gray-200 text-center font-bold text-blue-600">
                                {data.count}
                              </td>
                              <td className="px-6 py-4 border-b border-gray-200 text-right font-bold text-green-600">
                                {data.revenue.toLocaleString()}đ
                              </td>
                              <td className="px-6 py-4 border-b border-gray-200 text-center">
                                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold">
                                  {((data.count / bookings.length) * 100).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-teal-100 font-bold">
                          <td className="px-6 py-4 border-t-2 border-teal-300">
                            TỔNG CỘNG
                          </td>
                          <td className="px-6 py-4 border-t-2 border-teal-300 text-center text-blue-600">
                            {bookings.length}
                          </td>
                          <td className="px-6 py-4 border-t-2 border-teal-300 text-right text-green-600">
                            {totalRevenue.toLocaleString()}đ
                          </td>
                          <td className="px-6 py-4 border-t-2 border-teal-300 text-center text-teal-700">
                            100%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Visual Chart Representation */}
              {Object.keys(vaccineStats).length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-teal-600" />
                    Biểu Đồ Trực Quan
                  </h2>
                  
                  <div className="space-y-4">
                    {Object.entries(vaccineStats)
                      .sort((a, b) => b[1].count - a[1].count)
                      .map(([name, data]) => {
                        const percentage = (data.count / bookings.length) * 100;
                        return (
                          <div key={name} className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">{name}</span>
                              <span className="text-sm text-gray-600">
                                {data.count} lượt ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: 'from-blue-50 to-indigo-50 border-blue-200',
    green: 'from-green-50 to-emerald-50 border-green-200',
    orange: 'from-orange-50 to-amber-50 border-orange-200',
    purple: 'from-purple-50 to-pink-50 border-purple-200'
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-6 border-2 shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}