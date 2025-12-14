// src/App.js - ĐÃ SỬA HOÀN CHỈNH, CHẠY NGON LUÔN!
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// === USER PAGES ===
import HomePage from './pages/User/HomePage';
import LoginPage from './pages/User/LoginPage';
import DashboardPage from './pages/User/DashboardPage';
import UserPage from './pages/User/UserPage';
import BookingPage from './pages/User/BookingPage';
import QuickBookingPage from './pages/User/QuickBookingPage';
import MyBookingsPage from './pages/User/MyBookingsPage';
import NotificationsPage from './pages/User/NotificationsPage';

// === STAFF PAGES ===
import StaffDashboardPage from './pages/Staff/StaffDashboardPage';
import StaffRecordsPage from './pages/Staff/StaffRecordsPage';
import StaffReportsPage from './pages/Staff/StaffReportsPage';
import StaffNotificationsPage from './pages/Staff/StaffNotificationsPage';
import StaffSchedulePage from './pages/Staff/StaffSchedulePage';

// === ADMIN PAGES ===
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCenters from './pages/admin/AdminCenters';
import AdminVaccines from './pages/admin/AdminVaccines';
import AdminStaff from './pages/admin/AdminStaff';



function App() {
  return (
    <>
      {/* Toast notification – đẹp lung linh */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1f2937',
            color: '#fff',
            fontSize: '15px',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          },
          success: {
            icon: 'Success',
            style: { background: '#10b981', color: 'white' },
          },
          error: {
            icon: 'Error',
            style: { background: '#ef4444', color: 'white' },
          },
          loading: {
            style: { background: '#1e40af', color: 'white' },
          },
        }}
      />

      {/* Router – bao bọc toàn bộ app */}
      <Router>
        <Routes>
          {/* User Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<UserPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:centerId" element={<QuickBookingPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Staff Routes */}
          <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
          <Route path="/staff/records" element={<StaffRecordsPage />} />
          <Route path="/staff/reports" element={<StaffReportsPage />} />
          <Route path="/staff/notifications" element={<StaffNotificationsPage />} />
          <Route path="/staff/schedule" element={<StaffSchedulePage />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/centers" element={<AdminCenters />} />
          <Route path="/admin/vaccines" element={<AdminVaccines />} />
          <Route path="/admin/staff" element={<AdminStaff />} />

          {/* 404 - Trang không tìm thấy (tùy chọn) */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-xl text-gray-600">Trang không tồn tại</p>
                <button 
                  onClick={() => window.history.back()} 
                  className="mt-6 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition"
                >
                  Quay lại
                </button>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </>
  );
}

export default App;