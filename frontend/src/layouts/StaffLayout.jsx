// src/components/StaffSidebar.js - Sidebar Navigation cho Staff
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, BarChart3, Bell,
  Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Shield, MapPin, User, Heart
} from 'lucide-react';
import { getCurrentUser, logout, hasRole } from '../utils/api';

export default function StaffSidebar({ staffInfo }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const menuItems = [
    {
      path: '/staff/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      hoverColor: 'hover:bg-teal-100'
    },
    {
      path: '/staff/schedule',
      icon: Calendar,
      label: 'Lịch Làm Việc',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100'
    },
    {
      path: '/staff/records',
      icon: FileText,
      label: 'Hồ Sơ Tiêm',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100'
    },
    {
      path: '/staff/reports',
      icon: BarChart3,
      label: 'Báo Cáo',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100'
    },
    {
      path: '/staff/notifications',
      icon: Bell,
      label: 'Thông Báo',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      hoverColor: 'hover:bg-pink-100'
    }
  ];

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      logout();
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-teal-600 text-white rounded-xl shadow-lg"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r-2 border-gray-200 shadow-2xl z-40 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-72'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 border-b-2 border-gray-200 ${collapsed ? 'px-3' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              {!collapsed && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-teal-600">TVN</h1>
                    <p className="text-xs text-gray-500">Adrenaline</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                {collapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* User Info */}
            {!collapsed && user && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-4 border-2 border-teal-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-teal-600 font-semibold">Nhân viên</p>
                  </div>
                </div>
                {staffInfo && (
                  <div className="flex items-start gap-2 text-xs text-gray-600 mt-2 pt-2 border-t border-teal-200">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-teal-600" />
                    <span className="line-clamp-2">{staffInfo.centerName}</span>
                  </div>
                )}
              </div>
            )}

            {collapsed && user && (
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                  <Shield className="w-7 h-7 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? `${item.bgColor} ${item.color} shadow-lg scale-105 font-bold`
                      : `text-gray-600 ${item.hoverColor}`
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon className={`w-6 h-6 flex-shrink-0 ${active ? item.color : ''}`} />
                  {!collapsed && (
                    <span className={`font-semibold ${active ? 'font-bold' : ''}`}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && active && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className={`p-4 border-t-2 border-gray-200 space-y-2 ${collapsed ? 'px-2' : ''}`}>
            <button
              onClick={() => navigate('/staff/settings')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? 'Cài đặt' : ''}
            >
              <Settings className="w-6 h-6 flex-shrink-0" />
              {!collapsed && <span className="font-semibold">Cài đặt</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition ${
                collapsed ? 'justify-center' : ''
              }`}
              title={collapsed ? 'Đăng xuất' : ''}
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              {!collapsed && <span className="font-semibold">Đăng xuất</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className={`${collapsed ? 'lg:w-20' : 'lg:w-72'} transition-all duration-300`} />
    </>
  );
}