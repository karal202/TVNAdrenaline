// src/pages/Admin/AdminUsers.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, Lock, Unlock,
  Mail, Phone, Calendar, Loader2, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';

import AdminSidebar from '../../components/AdminSidebar';
import { adminAPI, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isLoggedIn() || !hasRole(['admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    loadUsers();
  }, [navigate, search, statusFilter, page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ 
        search, 
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 20
      });
      setUsers(res.data.users);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error('Lỗi tải users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${action} user này?`)) return;

    try {
      await adminAPI.toggleUserStatus(userId);
      toast.success(`Đã ${action} user thành công`);
      loadUsers();
    } catch (err) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 ml-72">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Users className="w-10 h-10 text-purple-600" />
              Quản Lý Users
            </h1>
            <p className="text-gray-600">Quản lý tài khoản người dùng hệ thống</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Tổng Users</p>
              <p className="text-4xl font-bold text-purple-600">{total}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Đang Hoạt Động</p>
              <p className="text-4xl font-bold text-green-600">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <p className="text-gray-600 text-sm mb-1">Đã Khóa</p>
              <p className="text-4xl font-bold text-red-600">
                {users.filter(u => !u.isActive).length}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, email, số điện thoại..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                {['all', 'active', 'inactive'].map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setPage(1);
                    }}
                    className={`px-6 py-3 rounded-xl font-semibold transition ${
                      statusFilter === status
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'Tất cả' : status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={loadUsers}
                className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Đang tải dữ liệu...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Không tìm thấy user nào</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">ID</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Tên</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">SĐT</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Ngày Tạo</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Trạng Thái</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-mono text-gray-600">#{user.id}</td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{user.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {user.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                              user.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(user.id, user.isActive)}
                              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 mx-auto ${
                                user.isActive
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-green-100 text-green-600 hover:bg-green-200'
                              }`}
                            >
                              {user.isActive ? (
                                <>
                                  <Lock className="w-4 h-4" />
                                  Khóa
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  Mở
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Hiển thị {users.length} / {total} users
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 bg-purple-100 text-purple-600 font-bold rounded-lg">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}