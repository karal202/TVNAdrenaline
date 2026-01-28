// routes/staff.routes.js - Staff tools & center-level booking management

const setupStaffRoutes = ({
  app,
  pool,
  moment,
  authenticateToken,
  authorizeRole,
  sendNotification,
  broadcastToStaff
}) => {
  // ====================== STAFF ROUTES ======================

  // Lấy thông tin staff hiện tại (bao gồm centerId)
  app.get(
    '/api/staff/me',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT u.id, u.name, u.phone, u.email, u.role, u.centerId, 
                  vc.name as centerName, vc.address as centerAddress
           FROM Users u
           LEFT JOIN VaccinationCenters vc ON u.centerId = vc.id
           WHERE u.id = ?`,
          [req.user.id]
        );

        if (rows.length === 0) {
          return res.status(404).json({ message: 'Staff không tồn tại' });
        }

        res.json(rows[0]);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Xem bookings của trung tâm mình (Staff)
  app.get(
    '/api/staff/bookings',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { date, status } = req.query;

      try {
        // Lấy centerId của staff
        const [[staff]] = await pool.query(
          'SELECT centerId FROM Users WHERE id = ?',
          [req.user.id]
        );

        if (!staff || !staff.centerId) {
          return res.status(400).json({ message: 'Staff chưa được gán trung tâm' });
        }

        let query = `
          SELECT vb.*, 
                 u.name as userName, u.phone as userPhone,
                 v.name as vaccineName, v.price as vaccinePrice,
                 vc.name as centerName, 
                 ts.slotDate, ts.slotTime
          FROM VaccinationBookings vb
          JOIN Users u ON vb.userId = u.id
          JOIN Vaccines v ON vb.vaccineId = v.id
          JOIN VaccinationCenters vc ON vb.centerId = vc.id
          JOIN TimeSlots ts ON vb.timeSlotId = ts.id
          WHERE vb.centerId = ?
        `;
        const params = [staff.centerId];

        if (date) {
          query += ` AND ts.slotDate = ?`;
          params.push(date);
        }

        if (status) {
          query += ` AND vb.status = ?`;
          params.push(status);
        }

        query += ` ORDER BY ts.slotDate ASC, ts.slotTime ASC`;

        const [rows] = await pool.query(query, params);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Check-in khách hàng (chuyển pending → confirmed)
  app.patch(
    '/api/staff/bookings/:id/checkin',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { id } = req.params;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [[booking]] = await connection.query(
          'SELECT * FROM VaccinationBookings WHERE id = ?',
          [id]
        );
        if (!booking) throw new Error('Không tìm thấy lịch');

        await connection.execute(
          'UPDATE VaccinationBookings SET status = "confirmed" WHERE id = ?',
          [id]
        );
        await connection.commit();

        // ✅ GỬI THÔNG BÁO REAL-TIME CHO USER
        await sendNotification(
          booking.userId,
          'Đã check-in thành công',
          `Bé ${booking.childName} đã được check-in. Vui lòng chờ gọi số.`,
          'info'
        );

        // ✅ BROADCAST CHO STAFF KHÁC
        broadcastToStaff(booking.centerId, {
          type: 'checked_in',
          bookingId: id,
          centerId: booking.centerId
        });

        res.json({ message: 'Check-in thành công' });
      } catch (err) {
        await connection.rollback();
        console.error('Lỗi check-in:', err);
        res.status(400).json({ message: err.message });
      } finally {
        connection.release();
      }
    }
  );

  // Hoàn thành tiêm (Staff version)
  app.post(
    '/api/staff/bookings/:id/complete',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { id } = req.params;
      const { batchNumber } = req.body;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [[booking]] = await connection.query(
          'SELECT * FROM VaccinationBookings WHERE id = ?',
          [id]
        );
        if (!booking) throw new Error('Không tìm thấy lịch');

        await connection.execute(
          'UPDATE VaccinationBookings SET status = "completed", paymentStatus = "paid" WHERE id = ?',
          [id]
        );
        await connection.commit();

        // ✅ GỬI THÔNG BÁO REAL-TIME CHO USER
        await sendNotification(
          booking.userId,
          '🎉 Tiêm thành công!',
          `Bé ${booking.childName} đã được tiêm thành công! Số lô: ${
            batchNumber || 'N/A'
          }. Cảm ơn quý phụ huynh đã tin tưởng!`,
          'success'
        );

        // ✅ BROADCAST CHO STAFF KHÁC
        broadcastToStaff(booking.centerId, {
          type: 'injection_completed',
          bookingId: id,
          centerId: booking.centerId
        });

        res.json({ message: 'Tiêm thành công' });
      } catch (err) {
        await connection.rollback();
        console.error('Lỗi hoàn thành tiêm:', err);
        res.status(400).json({ message: err.message });
      } finally {
        connection.release();
      }
    }
  );

  // ==================== NO-SHOW → GỬI THÔNG BÁO ====================
  app.patch(
    '/api/staff/bookings/:id/no-show',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { id } = req.params;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        const [[booking]] = await connection.query(
          'SELECT * FROM VaccinationBookings WHERE id = ?',
          [id]
        );
        if (!booking) throw new Error('Không tìm thấy lịch');

        await connection.execute(
          'UPDATE VaccinationBookings SET status = "no_show" WHERE id = ?',
          [id]
        );
        await connection.execute(
          'UPDATE TimeSlots SET isBooked = 0, bookedBy = NULL WHERE id = ?',
          [booking.timeSlotId]
        );
        await connection.commit();

        // ✅ GỬI THÔNG BÁO CẢNH BÁO CHO USER
        await sendNotification(
          booking.userId,
          '⚠️ Lịch hẹn bị hủy',
          `Lịch tiêm của bé ${booking.childName} đã bị hủy do không đến đúng giờ. Vui lòng đặt lại lịch mới hoặc liên hệ hotline.`,
          'warning'
        );

        // ✅ BROADCAST CHO STAFF KHÁC
        broadcastToStaff(booking.centerId, {
          type: 'marked_no_show',
          bookingId: id,
          centerId: booking.centerId
        });

        res.json({ message: 'Đã đánh dấu no-show' });
      } catch (err) {
        await connection.rollback();
        console.error('Lỗi no-show:', err);
        res.status(400).json({ message: err.message });
      } finally {
        connection.release();
      }
    }
  );

  // Thống kê của staff (trung tâm mình)
  app.get(
    '/api/staff/stats',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { date } = req.query;
      const targetDate = date || moment().format('YYYY-MM-DD');

      try {
        const [[staff]] = await pool.query(
          'SELECT centerId FROM Users WHERE id = ?',
          [req.user.id]
        );

        if (!staff || !staff.centerId) {
          return res.status(400).json({ message: 'Staff chưa được gán trung tâm' });
        }

        // Tổng booking hôm nay
        const [[total]] = await pool.query(
          `SELECT COUNT(*) as total FROM VaccinationBookings vb
           JOIN TimeSlots ts ON vb.timeSlotId = ts.id
           WHERE vb.centerId = ? AND ts.slotDate = ?`,
          [staff.centerId, targetDate]
        );

        // Theo status
        const [statusCount] = await pool.query(
          `SELECT vb.status, COUNT(*) as count 
           FROM VaccinationBookings vb
           JOIN TimeSlots ts ON vb.timeSlotId = ts.id
           WHERE vb.centerId = ? AND ts.slotDate = ?
           GROUP BY vb.status`,
          [staff.centerId, targetDate]
        );

        // Vắc-xin đã dùng
        const [vaccineUsage] = await pool.query(
          `SELECT v.name, COUNT(*) as count
           FROM VaccinationBookings vb
           JOIN TimeSlots ts ON vb.timeSlotId = ts.id
           JOIN Vaccines v ON vb.vaccineId = v.id
           WHERE vb.centerId = ? AND ts.slotDate = ? AND vb.status = 'completed'
           GROUP BY v.id`,
          [staff.centerId, targetDate]
        );

        res.json({
          date: targetDate,
          total: total.total || 0,
          byStatus: statusCount,
          vaccineUsage
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Tìm kiếm booking (staff)
  app.get(
    '/api/staff/search',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { q } = req.query;

      if (!q || q.length < 3) {
        return res
          .status(400)
          .json({ message: 'Vui lòng nhập ít nhất 3 ký tự' });
      }

      try {
        const [[staff]] = await pool.query(
          'SELECT centerId FROM Users WHERE id = ?',
          [req.user.id]
        );

        if (!staff || !staff.centerId) {
          return res.status(400).json({ message: 'Staff chưa được gán trung tâm' });
        }

        const [rows] = await pool.query(
          `SELECT vb.*, 
                  u.name as userName, u.phone as userPhone,
                  v.name as vaccineName,
                  vc.name as centerName,
                  ts.slotDate, ts.slotTime
           FROM VaccinationBookings vb
           JOIN Users u ON vb.userId = u.id
           JOIN Vaccines v ON vb.vaccineId = v.id
           JOIN VaccinationCenters vc ON vb.centerId = vc.id
           JOIN TimeSlots ts ON vb.timeSlotId = ts.id
           WHERE vb.centerId = ?
             AND (
               vb.bookingCode LIKE ? OR
               vb.childName LIKE ? OR
               vb.parentName LIKE ? OR
               vb.parentPhone LIKE ?
             )
           ORDER BY ts.slotDate DESC, ts.slotTime DESC
           LIMIT 20`,
          [
            staff.centerId,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`,
            `%${q}%`
          ]
        );

        res.json(rows);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Gửi thông báo cho user (Staff/Admin)
  app.post(
    '/api/staff/send-notification',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { userId, title, message, type = 'info' } = req.body;

      if (!userId || !title || !message) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }

      try {
        // Kiểm tra user có tồn tại không
        const [[user]] = await pool.query(
          'SELECT id, name FROM Users WHERE id = ?',
          [userId]
        );
        if (!user) {
          return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Gửi thông báo
        await sendNotification(userId, title, message, type);

        res.json({
          message: 'Đã gửi thông báo thành công',
          sentTo: user.name
        });
      } catch (err) {
        console.error('Lỗi gửi thông báo:', err);
        res.status(500).json({ message: 'Lỗi server' });
      }
    }
  );

  // Lấy danh sách user để gửi thông báo (Staff/Admin)
  app.get(
    '/api/staff/users',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { search } = req.query;

      try {
        const [[staff]] = await pool.query(
          'SELECT centerId FROM Users WHERE id = ?',
          [req.user.id]
        );

        if (!staff || !staff.centerId) {
          return res.status(400).json({ message: 'Staff chưa được gán trung tâm' });
        }

        let query = `
          SELECT DISTINCT u.id, u.name, u.phone, u.email
          FROM Users u
          JOIN VaccinationBookings vb ON u.id = vb.userId
          WHERE vb.centerId = ? AND u.role = 'user' AND u.isActive = 1
        `;
        const params = [staff.centerId];

        if (search && search.length >= 2) {
          query += ` AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY u.name ASC LIMIT 50`;

        const [rows] = await pool.query(query, params);
        res.json(rows);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );
};

module.exports = setupStaffRoutes;

