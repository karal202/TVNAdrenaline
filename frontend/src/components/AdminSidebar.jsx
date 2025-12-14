// src/components/AdminSidebar.js
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCog, Building2, 
  Syringe, Calendar, Bell, Settings, 
  LogOut, ChevronRight, Activity
} from 'lucide-react';
import { logout, getCurrentUser } from '../utils/api';
import toast from 'react-hot-toast';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      logout();
      toast.success('Đã đăng xuất');
      navigate('/login');
    }
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard',
      color: 'text-blue-600'
    },
    {
      title: 'Quản Lý Users',
      icon: Users,
      path: '/admin/users',
      color: 'text-purple-600'
    },
    {
      title: 'Quản Lý Staff',
      icon: UserCog,
      path: '/admin/staff',
      color: 'text-green-600'
    },
    {
      title: 'Quản Lý Trung Tâm',
      icon: Building2,
      path: '/admin/centers',
      color: 'text-orange-600'
    },
    {
      title: 'Quản Lý Vaccine',
      icon: Syringe,
      path: '/admin/vaccines',
      color: 'text-red-600'
    },
    {
      title: 'Quản Lý Đặt Lịch',
      icon: Calendar,
      path: '/admin/bookings',
      color: 'text-teal-600'
    },
    {
      title: 'Thông Báo',
      icon: Bell,
      path: '/admin/notifications',
      color: 'text-yellow-600'
    }
  ];

  return (
    <div className="w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen fixed left-0 top-0 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">TVN Adrenaline</h1>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
        
        {/* User info */}
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
          <p className="text-sm font-semibold truncate">{user?.name}</p>
          <p className="text-xs text-gray-400">Administrator</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg scale-105'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                  <span className="font-medium flex-1">{item.title}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600/20 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}