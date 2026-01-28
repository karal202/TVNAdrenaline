// routes/user.routes.js - User bookings, timeslots & notifications

const setupUserRoutes = ({
  app,
  pool,
  moment,
  authenticateToken,
  sendNotification,
  broadcastToStaff,
  broadcastSlotUpdate
}) => {
  // ====================== USER ROUTES ======================

  app.get('/api/my/bookings', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT vb.*, v.name as vaccineName, vc.name as centerName, ts.slotDate, ts.slotTime
         FROM VaccinationBookings vb
         JOIN Vaccines v ON vb.vaccineId = v.id
         JOIN VaccinationCenters vc ON vb.centerId = vc.id
         JOIN TimeSlots ts ON vb.timeSlotId = ts.id
         WHERE vb.userId = ? ORDER BY vb.bookingDate DESC`,
        [req.user.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Tạm giữ slot
  app.post('/api/timeslots/reserve', authenticateToken, async (req, res) => {
    const { timeSlotId } = req.body;
    const reservedUntil = moment().add(10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE TimeSlots SET tempReserved = 0, reservedBy = NULL, reservedUntil = NULL
         WHERE reservedBy = ? AND tempReserved = 1 AND reservedUntil > NOW()`,
        [req.user.id]
      );

      const [result] = await connection.execute(
        `UPDATE TimeSlots SET tempReserved = 1, reservedBy = ?, reservedUntil = ?
         WHERE id = ? AND isActive = 1 AND isBooked = 0 AND (tempReserved = 0 OR reservedBy = ?)`,
        [req.user.id, reservedUntil, timeSlotId, req.user.id]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: 'Khung giờ đã được đặt hoặc đang được giữ' });
      }

      await connection.commit();

      // Real-time: thông báo slot bị giữ
      const [[slot]] = await pool.query(
        'SELECT centerId, slotDate FROM TimeSlots WHERE id = ?',
        [timeSlotId]
      );
      broadcastSlotUpdate(slot.centerId, slot.slotDate);

      res.json({ message: 'Đã giữ chỗ 10 phút', reservedUntil, timeSlotId });
    } catch (err) {
      await connection.rollback();
      res.status(500).json({ message: err.message });
    } finally {
      connection.release();
    }
  });

  // Hủy giữ chỗ
  app.post('/api/timeslots/release', authenticateToken, async (req, res) => {
    const { timeSlotId } = req.body;
    try {
      const [result] = await pool.execute(
        `UPDATE TimeSlots SET tempReserved = 0, reservedBy = NULL, reservedUntil = NULL
         WHERE id = ? AND reservedBy = ?`,
        [timeSlotId, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(400)
          .json({ message: 'Bạn không đang giữ khung giờ này' });
      }

      // Real-time update
      const [[slot]] = await pool.query(
        'SELECT centerId, slotDate FROM TimeSlots WHERE id = ?',
        [timeSlotId]
      );
      broadcastSlotUpdate(slot.centerId, slot.slotDate);

      res.json({ message: 'Đã bỏ giữ chỗ', timeSlotId });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Đặt lịch chính thức
  app.post('/api/bookings', authenticateToken, async (req, res) => {
    const {
      childName,
      childBirthDate,
      childGender,
      parentName,
      parentPhone,
      vaccineId,
      doseNumber = 1,
      centerId,
      timeSlotId,
      notes
    } = req.body;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy thông tin slot với slotDate và slotTime
      const [[slot]] = await connection.query(
        `SELECT * FROM TimeSlots WHERE id = ? AND isActive = 1 FOR UPDATE`,
        [timeSlotId]
      );

      if (
        !slot ||
        slot.centerId != centerId ||
        slot.isBooked ||
        (slot.tempReserved && slot.reservedBy !== req.user.id)
      ) {
        throw new Error('Khung giờ không khả dụng');
      }

      // Lấy thông tin vaccine
      const [[vaccine]] = await connection.query(
        `SELECT name FROM Vaccines WHERE id = ?`,
        [vaccineId]
      );

      const bookingCode = 'TVN' + Date.now().toString().slice(-8);

      // Insert booking
      const [result] = await connection.execute(
        `INSERT INTO VaccinationBookings 
        (bookingCode, userId, childName, childBirthDate, childGender, parentName, parentPhone,
         vaccineId, doseNumber, centerId, timeSlotId, notes, status, paymentStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')`,
        [
          bookingCode,
          req.user.id,
          childName,
          childBirthDate,
          childGender,
          parentName,
          parentPhone,
          vaccineId,
          doseNumber,
          centerId,
          timeSlotId,
          notes || null
        ]
      );

      const bookingId = result.insertId;

      // Update slot
      await connection.execute(
        `UPDATE TimeSlots SET isBooked = 1, bookedBy = ?, tempReserved = 0, reservedBy = NULL, reservedUntil = NULL
         WHERE id = ?`,
        [req.user.id, timeSlotId]
      );

      await connection.commit();

      // ✅ GỬI THÔNG BÁO REAL-TIME CHO USER
      await sendNotification(
        req.user.id,
        'Đặt lịch thành công!',
        `Mã lịch: ${bookingCode} – Bé ${childName} đã được đặt lịch thành công! Ngày ${slot.slotDate} lúc ${slot.slotTime}`,
        'success'
      );

      // ✅ THÔNG BÁO CHO STAFF (broadcast) - GỬI ĐẦY ĐỦ DATA
      broadcastToStaff(centerId, {
        type: 'booking_created',
        data: {
          bookingId: bookingId,
          bookingCode: bookingCode,
          childName: childName,
          parentName: parentName,
          parentPhone: parentPhone,
          vaccineName: vaccine?.name || 'N/A',
          doseNumber: doseNumber,
          slotDate: slot.slotDate,
          slotTime: slot.slotTime,
          centerId: centerId,
          status: 'pending'
        }
      });

      // ✅ CẬP NHẬT SLOT CHO TẤT CẢ CLIENT
      broadcastSlotUpdate(centerId, slot.slotDate);

      res.json({ message: 'Đặt lịch thành công!', bookingCode, bookingId });
    } catch (err) {
      await connection.rollback();
      console.error('Lỗi đặt lịch:', err);
      res.status(400).json({ message: err.message });
    } finally {
      connection.release();
    }
  });

  // Hủy đặt chỗ - GIẢI PHÓNG SLOT
  app.patch('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [[booking]] = await connection.query(
        `SELECT vb.*, ts.slotDate, ts.slotTime FROM VaccinationBookings vb
         JOIN TimeSlots ts ON vb.timeSlotId = ts.id
         WHERE vb.id = ? AND vb.userId = ?`,
        [id, req.user.id]
      );

      if (!booking) {
        await connection.rollback();
        return res.status(404).json({ message: 'Không tìm thấy lịch' });
      }

      if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        await connection.rollback();
        return res.status(400).json({
          message: 'Chỉ có thể hủy lịch đang chờ hoặc đã xác nhận'
        });
      }

      const hoursDiff = moment().diff(
        moment(`${booking.slotDate} ${booking.slotTime}`),
        'hours'
      );

      if (hoursDiff > -24) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: 'Chỉ được hủy trước 24h' });
      }

      await connection.execute(
        `UPDATE VaccinationBookings 
         SET status = 'cancelled', paymentStatus = 'refunded' 
         WHERE id = ?`,
        [id]
      );

      // ✅ Giải phóng slot
      await connection.execute(
        `UPDATE TimeSlots 
         SET isBooked = 0, bookedBy = NULL 
         WHERE id = ?`,
        [booking.timeSlotId]
      );

      await connection.commit();

      // ✅ GỬI THÔNG BÁO XÁC NHẬN HỦY
      await sendNotification(
        req.user.id,
        'Đã hủy lịch thành công',
        `Lịch tiêm của bé ${booking.childName} vào ngày ${booking.slotDate} đã được hủy. Bạn có thể đặt lịch mới bất kỳ lúc nào!`,
        'info'
      );

      // ✅ BROADCAST CHO STAFF
      broadcastToStaff(booking.centerId, {
        type: 'booking_cancelled',
        bookingId: id,
        centerId: booking.centerId
      });

      res.json({ message: 'Hủy lịch thành công' });
    } catch (err) {
      await connection.rollback();
      res.status(500).json({ message: err.message });
    } finally {
      connection.release();
    }
  });

  // Lấy thông báo của user
  app.get('/api/my/notifications', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM Notifications 
         WHERE userId = ? 
         ORDER BY createdAt DESC 
         LIMIT 50`,
        [req.user.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Đánh dấu đã đọc thông báo
  app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      await pool.execute(
        'UPDATE Notifications SET isRead = 1 WHERE id = ? AND userId = ?',
        [req.params.id, req.user.id]
      );
      res.json({ message: 'Đánh dấu đã đọc' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
};

module.exports = setupUserRoutes;

