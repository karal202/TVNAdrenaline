// src/pages/Admin/AdminVaccines.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Syringe, Plus, Edit2, Trash2, DollarSign,
  Package, AlertCircle, Loader2, X, Save, Eye, EyeOff
} from 'lucide-react';

import AdminSidebar from '../../components/AdminSidebar';
import { adminAPI, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminVaccines() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [vaccines, setVaccines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentVaccine, setCurrentVaccine] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    manufacturer: '',
    targetAge: '',
    doseInfo: '',
    price: '',
    stock: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    if (!isLoggedIn() || !hasRole(['admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    loadVaccines();
  }, [navigate]);

  const loadVaccines = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getVaccines();
      setVaccines(res.data);
    } catch (err) {
      toast.error('Lỗi tải vaccine: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vaccine = null) => {
    if (vaccine) {
      setEditMode(true);
      setCurrentVaccine(vaccine);
      setFormData({
        name: vaccine.name,
        shortName: vaccine.shortName || '',
        manufacturer: vaccine.manufacturer || '',
        targetAge: vaccine.targetAge || '',
        doseInfo: vaccine.doseInfo || '',
        price: vaccine.price,
        stock: vaccine.stock,
        description: vaccine.description || '',
        isActive: vaccine.isActive
      });
    } else {
      setEditMode(false);
      setCurrentVaccine(null);
      setFormData({
        name: '',
        shortName: '',
        manufacturer: '',
        targetAge: '',
        doseInfo: '',
        price: '',
        stock: '',
        description: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentVaccine(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      if (editMode) {
        await adminAPI.updateVaccine(currentVaccine.id, formData);
        toast.success('Cập nhật vaccine thành công');
      } else {
        await adminAPI.createVaccine(formData);
        toast.success('Thêm vaccine thành công');
      }
      handleCloseModal();
      loadVaccines();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const handleDelete = async (vaccineId, vaccineName) => {
    if (!window.confirm(`Bạn có chắc muốn vô hiệu hóa vaccine "${vaccineName}"?`)) return;

    try {
      await adminAPI.deleteVaccine(vaccineId);
      toast.success('Đã vô hiệu hóa vaccine');
      loadVaccines();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + ' ₫';
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
                <Syringe className="w-10 h-10 text-red-600" />
                Quản Lý Vaccine
              </h1>
              <p className="text-gray-600">Quản lý vaccine và tồn kho</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition"
            >
              <Plus className="w-5 h-5" />
              Thêm Vaccine
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Vaccine</p>
              <p className="text-4xl font-bold text-red-600">{vaccines.length}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Đang Bán</p>
              <p className="text-4xl font-bold text-green-600">
                {vaccines.filter(v => v.isActive).length}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Tồn Kho</p>
              <p className="text-4xl font-bold text-blue-600">
                {vaccines.reduce((sum, v) => sum + (v.stock || 0), 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Bookings</p>
              <p className="text-4xl font-bold text-purple-600">
                {vaccines.reduce((sum, v) => sum + (v.bookingCount || 0), 0)}
              </p>
            </div>
          </div>

          {/* Grid Layout */}
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : vaccines.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-20 text-center">
              <Syringe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Chưa có vaccine nào</p>
              <button
                onClick={() => handleOpenModal()}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
              >
                Thêm Vaccine Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {vaccines.map((vaccine) => (
                <div
                  key={vaccine.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all ${
                    !vaccine.isActive ? 'opacity-60' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{vaccine.name}</h3>
                        {vaccine.shortName && (
                          <p className="text-sm text-red-100">{vaccine.shortName}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        vaccine.isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-red-900/50 text-red-100'
                      }`}>
                        {vaccine.isActive ? 'Đang bán' : 'Đã tắt'}
                      </span>
                    </div>
                    {vaccine.manufacturer && (
                      <p className="text-sm text-red-100">
                        Hãng: {vaccine.manufacturer}
                      </p>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4">
                    {/* Price & Stock */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-green-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-green-700 text-xs mb-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-semibold">Giá</span>
                        </div>
                        <p className="text-lg font-bold text-green-700">
                          {formatPrice(vaccine.price)}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 ${
                        vaccine.stock < 10 ? 'bg-red-50' : 'bg-blue-50'
                      }`}>
                        <div className={`flex items-center gap-2 text-xs mb-1 ${
                          vaccine.stock < 10 ? 'text-red-700' : 'text-blue-700'
                        }`}>
                          <Package className="w-3 h-3" />
                          <span className="font-semibold">Tồn kho</span>
                        </div>
                        <p className={`text-lg font-bold ${
                          vaccine.stock < 10 ? 'text-red-700' : 'text-blue-700'
                        }`}>
                          {vaccine.stock}
                          {vaccine.stock < 10 && <AlertCircle className="inline w-4 h-4 ml-1" />}
                        </p>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 text-sm mb-4">
                      {vaccine.targetAge && (
                        <div>
                          <span className="font-semibold text-gray-700">Độ tuổi:</span>
                          <span className="text-gray-600 ml-2">{vaccine.targetAge}</span>
                        </div>
                      )}
                      {vaccine.doseInfo && (
                        <div>
                          <span className="font-semibold text-gray-700">Lịch tiêm:</span>
                          <span className="text-gray-600 ml-2">{vaccine.doseInfo}</span>
                        </div>
                      )}
                      {vaccine.description && (
                        <div>
                          <span className="font-semibold text-gray-700">Mô tả:</span>
                          <p className="text-gray-600 mt-1 line-clamp-2">{vaccine.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Bookings</p>
                        <p className="text-lg font-bold text-purple-600">{vaccine.bookingCount || 0}</p>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">ID</p>
                        <p className="text-lg font-bold text-gray-700">#{vaccine.id}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(vaccine)}
                        className="flex-1 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-semibold flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(vaccine.id, vaccine.name)}
                        className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition font-semibold flex items-center justify-center gap-2"
                      >
                        <EyeOff className="w-4 h-4" />
                        Tắt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editMode ? 'Chỉnh Sửa Vaccine' : 'Thêm Vaccine Mới'}
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
                    Tên vaccine <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tên viết tắt
                  </label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                    placeholder="VD: Hexaxim"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Hãng sản xuất
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                    placeholder="VD: GSK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Độ tuổi khuyến cáo
                  </label>
                  <input
                    type="text"
                    value={formData.targetAge}
                    onChange={(e) => setFormData({ ...formData, targetAge: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                    placeholder="VD: 2-4-6 tháng"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Lịch tiêm
                  </label>
                  <input
                    type="text"
                    value={formData.doseInfo}
                    onChange={(e) => setFormData({ ...formData, doseInfo: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                    placeholder="VD: 3 mũi cơ bản"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Giá (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tồn kho
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 outline-none resize-none"
                    rows="3"
                    placeholder="Mô tả về vaccine..."
                  />
                </div>

                {editMode && (
                  <div className="col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="font-semibold text-gray-700">Vaccine đang bán</span>
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
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