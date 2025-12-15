// src/pages/Admin/AdminStaff.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCog, Plus, Edit2, Trash2, Building2,
  Mail, Phone, Loader2, RefreshCw, X, Save
} from 'lucide-react';

import AdminSidebar from '../../components/AdminSidebar';
import { adminAPI, publicAPI, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminStaff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [centers, setCenters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    centerId: ''
  });

  useEffect(() => {
    if (!isLoggedIn() || !hasRole(['admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, centersRes] = await Promise.all([
        adminAPI.getStaff(),
        publicAPI.getCenters()
      ]);
      setStaff(staffRes.data);
      setCenters(centersRes.data);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (staffItem = null) => {
    if (staffItem) {
      setEditMode(true);
      setCurrentStaff(staffItem);
      setFormData({
        name: staffItem.name,
        phone: staffItem.phone,
        email: staffItem.email,
        password: '',
        centerId: staffItem.centerId || ''
      });
    } else {
      setEditMode(false);
      setCurrentStaff(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        password: '',
        centerId: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentStaff(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      centerId: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.email) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!editMode && !formData.password) {
      toast.error('Vui lòng nhập mật khẩu');
      return;
    }

    try {
      if (editMode) {
        await adminAPI.updateStaff(currentStaff.id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          centerId: formData.centerId || null
        });
        toast.success('Cập nhật staff thành công');
      } else {
        await adminAPI.createStaff(formData);
        toast.success('Thêm staff thành công');
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (staffId, staffName) => {
    if (!window.confirm(`Bạn có chắc muốn xóa staff "${staffName}"?`)) return;

    try {
      await adminAPI.deleteStaff(staffId);
      toast.success('Xóa staff thành công');
      loadData();
    } catch (err) {
      toast.error('Lỗi xóa staff: ' + err.message);
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
                <UserCog className="w-10 h-10 text-green-600" />
                Quản Lý Staff
              </h1>
              <p className="text-gray-600">Quản lý nhân viên hệ thống</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              Thêm Staff
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Staff</p>
              <p className="text-4xl font-bold text-green-600">{staff.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Đã Gán Trung Tâm</p>
              <p className="text-4xl font-bold text-blue-600">
                {staff.filter(s => s.centerId).length}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Chưa Gán</p>
              <p className="text-4xl font-bold text-orange-600">
                {staff.filter(s => !s.centerId).length}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                <p className="text-gray-600">Đang tải dữ liệu...</p>
              </div>
            ) : staff.length === 0 ? (
              <div className="text-center py-20">
                <UserCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Chưa có staff nào</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
                >
                  Thêm Staff Đầu Tiên
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">ID</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Tên</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">SĐT</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Trung Tâm</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {staff.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">#{s.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{s.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {s.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {s.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {s.centerName ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">{s.centerName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Chưa gán</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenModal(s)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                              title="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editMode ? 'Chỉnh Sửa Staff' : 'Thêm Staff Mới'}
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
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                    required
                  />
                </div>

                {!editMode && (
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Mật khẩu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                      required={!editMode}
                    />
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Trung tâm
                  </label>
                  <select
                    value={formData.centerId}
                    onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 outline-none"
                  >
                    <option value="">-- Chưa gán trung tâm --</option>
                    {centers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
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