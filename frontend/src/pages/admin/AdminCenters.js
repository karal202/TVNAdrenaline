// src/pages/Admin/AdminCenters.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, Edit2, Trash2, MapPin,
  Phone, Clock, Users, Calendar, Loader2, X, Save, Eye, EyeOff
} from 'lucide-react';

import AdminSidebar from '../../components/AdminSidebar';
import { adminAPI, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminCenters() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCenter, setCurrentCenter] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    openHours: '07:30 - 17:30',
    latitude: '',
    longitude: '',
    isActive: true
  });

  useEffect(() => {
    if (!isLoggedIn() || !hasRole(['admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    loadCenters();
  }, [navigate]);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getCenters();
      setCenters(res.data);
    } catch (err) {
      toast.error('Lỗi tải trung tâm: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (center = null) => {
    if (center) {
      setEditMode(true);
      setCurrentCenter(center);
      setFormData({
        name: center.name,
        address: center.address,
        phone: center.phone || '',
        openHours: center.openHours || '07:30 - 17:30',
        latitude: center.latitude || '',
        longitude: center.longitude || '',
        isActive: center.isActive
      });
    } else {
      setEditMode(false);
      setCurrentCenter(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        openHours: '07:30 - 17:30',
        latitude: '',
        longitude: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentCenter(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.address) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      if (editMode) {
        await adminAPI.updateCenter(currentCenter.id, formData);
        toast.success('Cập nhật trung tâm thành công');
      } else {
        await adminAPI.createCenter(formData);
        toast.success('Thêm trung tâm thành công');
      }
      handleCloseModal();
      loadCenters();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (centerId, centerName) => {
    if (!window.confirm(`Bạn có chắc muốn vô hiệu hóa trung tâm "${centerName}"?`)) return;

    try {
      await adminAPI.deleteCenter(centerId);
      toast.success('Đã vô hiệu hóa trung tâm');
      loadCenters();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 ml-72">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <Building2 className="w-10 h-10 text-orange-600" />
                Quản Lý Trung Tâm
              </h1>
              <p className="text-gray-600">Quản lý các trung tâm tiêm chủng</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              Thêm Trung Tâm
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Trung Tâm</p>
              <p className="text-4xl font-bold text-orange-600">{centers.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Đang Hoạt Động</p>
              <p className="text-4xl font-bold text-green-600">
                {centers.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Staff</p>
              <p className="text-4xl font-bold text-blue-600">
                {centers.reduce((sum, c) => sum + (c.staffCount || 0), 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Bookings</p>
              <p className="text-4xl font-bold text-purple-600">
                {centers.reduce((sum, c) => sum + (c.bookingCount || 0), 0)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
                <p className="text-gray-600">Đang tải dữ liệu...</p>
              </div>
            ) : centers.length === 0 ? (
              <div className="text-center py-20">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Chưa có trung tâm nào</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition"
                >
                  Thêm Trung Tâm Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Tên</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Địa chỉ</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">SĐT</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Giờ mở cửa</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Staff</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Bookings</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Trạng thái</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {centers.map((center) => (
                      <tr key={center.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">#{center.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{center.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2 text-sm text-gray-600 max-w-xs">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{center.address}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {center.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            {center.openHours}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {center.staffCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                            {center.bookingCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                            center.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {center.isActive ? 'Hoạt động' : 'Đã tắt'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenModal(center)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                              title="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(center.id, center.name)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                              title="Vô hiệu hóa"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editMode ? 'Chỉnh Sửa Trung Tâm' : 'Thêm Trung Tâm Mới'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tên trung tâm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Địa chỉ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none resize-none"
                    rows="2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Giờ mở cửa
                  </label>
                  <input
                    type="text"
                    value={formData.openHours}
                    onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                    placeholder="07:30 - 17:30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Latitude (Vĩ độ)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                    placeholder="21.0285"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Longitude (Kinh độ)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 outline-none"
                    placeholder="105.8542"
                  />
                </div>

                {editMode && (
                  <div className="col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <span className="font-semibold text-gray-700">Trung tâm đang hoạt động</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editMode ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}