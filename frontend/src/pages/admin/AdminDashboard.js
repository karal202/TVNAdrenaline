// src/pages/Admin/AdminDashboard.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCog, Calendar, TrendingUp,
  DollarSign, Activity, Syringe, Building2,
  Loader2, ArrowUp, ArrowDown
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import AdminSidebar from '../../components/AdminSidebar';
import { adminAPI, isLoggedIn, hasRole } from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isLoggedIn() || !hasRole(['admin'])) {
      navigate('/login', { replace: true });
      return;
    }
    loadDashboard();
  }, [navigate]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDashboard();
      setStats(res.data);
    } catch (err) {
      toast.error('Lỗi tải dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <AdminSidebar />
        <div className="flex-1 ml-72 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tổng Users',
      value: stats?.users || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: '+12%'
    },
    {
      title: 'Tổng Staff',
      value: stats?.staff || 0,
      icon: UserCog,
      color: 'from-green-500 to-green-600',
      change: '+5%'
    },
    {
      title: 'Tổng Bookings',
      value: stats?.bookings || 0,
      icon: Calendar,
      color: 'from-purple-500 to-purple-600',
      change: '+18%'
    },
    {
      title: 'Bookings Hôm Nay',
      value: stats?.todayBookings || 0,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      change: '+8%'
    }
  ];

  // Prepare chart data
  const statusData = (stats?.statusStats || []).map(s => ({
    name: s.status,
    value: s.count
  }));

  const COLORS = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    completed: '#10b981',
    cancelled: '#ef4444',
    no_show: '#6b7280'
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      
      <div className="flex-1 ml-72">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">Tổng quan hệ thống TVN Adrenaline</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                    <ArrowUp className="w-4 h-4" />
                    {stat.change}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800">{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Bookings 7 ngày */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Bookings 7 Ngày Gần Nhất</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.weeklyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#14b8a6" strokeWidth={3} name="Số lượng" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Phân Bổ Trạng Thái</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#6b7280'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Vaccines */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Syringe className="w-6 h-6 text-red-600" />
                Top 5 Vaccines
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.topVaccines || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name="Số lượng" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Centers */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-orange-600" />
                Top 5 Trung Tâm
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.topCenters || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" name="Số lượng" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl shadow-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-lg mb-2">Doanh Thu Tháng Này (Ước Tính)</p>
                <p className="text-5xl font-bold">
                  {(stats?.revenue || 0).toLocaleString('vi-VN')} ₫
                </p>
              </div>
              <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center">
                <DollarSign className="w-14 h-14" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}