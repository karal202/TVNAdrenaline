// src/pages/StaffRecordsPage.js - Lịch sử hồ sơ tiêm chủng
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Calendar, Shield, User, Phone, 
  ChevronLeft, Loader2, Download, Eye, Filter, Baby
} from 'lucide-react';

import StaffLayout from '../../layouts/StaffLayout';
import { staffAPI, getCurrentUser, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function StaffRecordsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
    if (staffInfo) loadRecords();
  }, [staffInfo]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      // Lấy tất cả booking đã completed
      const res = await staffAPI.getBookings({ status: 'completed' });
      setRecords(res.data || []);
    } catch (err) {
      toast.error('Lỗi tải hồ sơ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = !searchQuery || 
      r.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bookingCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchDate = (!dateFrom || r.slotDate >= dateFrom) && 
                      (!dateTo || r.slotDate <= dateTo);

    return matchSearch && matchDate;
  });

  const handleViewDetail = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleExportCSV = () => {
    const csv = [
      ['Mã booking', 'Tên bé', 'Ngày sinh', 'Vắc-xin', 'Mũi', 'Ngày tiêm', 'Phụ huynh', 'SĐT'].join(','),
      ...filteredRecords.map(r => [
        r.bookingCode,
        r.childName,
        r.childBirthDate,
        r.vaccineName,
        r.doseNumber,
        r.slotDate,
        r.parentName,
        r.parentPhone
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vaccination-records-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Đã xuất file CSV');
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
                <FileText className="w-10 h-10 text-teal-600" />
                Hồ Sơ Tiêm Chủng
              </h1>
              <p className="text-gray-600">Lịch sử các mũi tiêm đã hoàn thành</p>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50 font-semibold"
            >
              <Download className="w-5 h-5" />
              Xuất CSV
            </button>
          </div>

          {/* Filters */}
          <div className="grid md:grid-cols-3 gap-4 mb-6 p-6 bg-gray-50 rounded-2xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tên bé, mã booking..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-4 border-2 border-teal-200">
              <p className="text-sm text-gray-600 mb-1">Tổng hồ sơ</p>
              <p className="text-3xl font-bold text-teal-600">{filteredRecords.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Hôm nay</p>
              <p className="text-3xl font-bold text-blue-600">
                {filteredRecords.filter(r => r.slotDate === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
              <p className="text-sm text-gray-600 mb-1">Tuần này</p>
              <p className="text-3xl font-bold text-green-600">
                {filteredRecords.filter(r => {
                  const recordDate = new Date(r.slotDate);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return recordDate >= weekAgo;
                }).length}
              </p>
            </div>
          </div>

          {/* Records List */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-3" />
              <p className="text-gray-600">Đang tải...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có hồ sơ nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="border-2 border-gray-200 rounded-2xl p-5 hover:border-teal-400 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Baby className="w-6 h-6 text-teal-600" />
                        <h3 className="text-xl font-bold">{record.childName}</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          ✓ Đã hoàn thành
                        </span>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(record.slotDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>{record.vaccineName} - Mũi {record.doseNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{record.parentName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${record.parentPhone}`} className="text-teal-600 hover:underline">
                            {record.parentPhone}
                          </a>
                        </div>
                        <div className="md:col-span-2 font-mono text-xs bg-gray-100 px-3 py-1 rounded">
                          Mã: {record.bookingCode}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewDetail(record)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold flex items-center gap-2 whitespace-nowrap"
                    >
                      <Eye className="w-5 h-5" />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FileText className="w-8 h-8 text-teal-600" />
                  Chi Tiết Hồ Sơ
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-teal-50 rounded-2xl p-5 border-2 border-teal-200">
                  <p className="text-sm text-gray-600 mb-1">Mã booking</p>
                  <p className="text-xl font-bold text-teal-600 font-mono">{selectedRecord.bookingCode}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <InfoItem icon={<Baby className="w-5 h-5" />} label="Tên bé" value={selectedRecord.childName} />
                  <InfoItem icon={<Calendar className="w-5 h-5" />} label="Ngày sinh" value={new Date(selectedRecord.childBirthDate).toLocaleDateString('vi-VN')} />
                  <InfoItem icon={<User className="w-5 h-5" />} label="Phụ huynh" value={selectedRecord.parentName} />
                  <InfoItem icon={<Phone className="w-5 h-5" />} label="Số điện thoại" value={selectedRecord.parentPhone} />
                  <InfoItem icon={<Shield className="w-5 h-5" />} label="Vắc-xin" value={selectedRecord.vaccineName} />
                  <InfoItem icon={<FileText className="w-5 h-5" />} label="Mũi thứ" value={`Mũi ${selectedRecord.doseNumber}`} />
                  <InfoItem icon={<Calendar className="w-5 h-5" />} label="Ngày tiêm" value={new Date(selectedRecord.slotDate).toLocaleDateString('vi-VN')} />
                  <InfoItem icon={<FileText className="w-5 h-5" />} label="Giá" value={`${Number(selectedRecord.vaccinePrice || 0).toLocaleString()}đ`} />
                </div>

                {selectedRecord.notes && (
                  <div className="bg-blue-50 rounded-2xl p-5 border-2 border-blue-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📝 Ghi chú:</p>
                    <p className="text-gray-600">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full mt-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-600 mb-1">
        {icon}
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}