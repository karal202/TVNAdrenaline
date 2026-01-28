// routes/qr.routes.js - QR code generation & staff QR check-in

const setupQrRoutes = ({
  app,
  pool,
  QRCode,
  crypto,
  JWT_SECRET,
  authenticateToken,
  authorizeRole,
  sendNotification,
  broadcastToStaff
}) => {
  // ==================== QR CODE ROUTES ====================

  app.get('/api/bookings/:id/qr', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const [[booking]] = await pool.query(
        `SELECT 
           vb.id,
           vb.bookingCode,
           vb.childName,
           vb.centerId,
           vb.userId,
           vb.status,
           ts.slotDate,
           ts.slotTime
         FROM VaccinationBookings vb
         JOIN TimeSlots ts ON vb.timeSlotId = ts.id
         WHERE vb.id = ?`,
        [id]
      );

      if (!booking) {
        return res.status(404).json({ message: 'Không tìm thấy lịch đặt' });
      }

      if (booking.userId !== req.user.id) {
        return res.status(403).json({ message: 'Không có quyền truy cập' });
      }

      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res
          .status(400)
          .json({ message: 'QR chỉ khả dụng cho lịch pending hoặc confirmed' });
      }

      // Tạo QR payload
      const qrPayload = {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        childName: booking.childName,
        centerId: booking.centerId,
        timestamp: Date.now()
      };

      // Tạo chữ ký
      const signature = crypto
        .createHash('sha256')
        .update(`${booking.id}-${booking.bookingCode}-${JWT_SECRET}`)
        .digest('hex')
        .slice(0, 16);

      qrPayload.signature = signature;

      const qrString = JSON.stringify(qrPayload);

      // Tạo QR image
      const qrImage = await QRCode.toDataURL(qrString, {
        width: 400,
        margin: 2,
        color: { dark: '#0d9488', light: '#ffffff' }
      });

      // Xử lý validUntil
      let validUntil = null;

      try {
        if (booking.slotDate && booking.slotTime) {
          // Lấy ngày từ slotDate
          let dateStr;
          if (typeof booking.slotDate === 'string') {
            // Nếu là string ISO, lấy phần YYYY-MM-DD
            dateStr = booking.slotDate.split('T')[0];
          } else if (booking.slotDate instanceof Date) {
            // Nếu là Date object
            dateStr = booking.slotDate.toISOString().split('T')[0];
          } else {
            dateStr = booking.slotDate;
          }

          // Lấy giờ từ slotTime (có thể là "HH:mm:ss" hoặc TIME object)
          let timeStr;
          if (typeof booking.slotTime === 'string') {
            timeStr = booking.slotTime.slice(0, 8); // "HH:mm:ss"
          } else {
            timeStr = booking.slotTime.toString().slice(0, 8);
          }

          // Ghép lại thành datetime string
          const dateTimeStr = `${dateStr}T${timeStr}`;
          const dateObj = new Date(dateTimeStr);

          // Kiểm tra date hợp lệ
          if (!isNaN(dateObj.getTime())) {
            validUntil = dateObj.toISOString();
          }
        }
      } catch (err) {
        console.error('Error parsing validUntil:', err);
        // Nếu lỗi, để validUntil = null, không crash
      }

      res.json({
        qrCode: qrImage,
        qrData: qrPayload,
        validUntil: validUntil
      });
    } catch (err) {
      console.error('QR generation error:', err);
      res.status(500).json({
        message: 'Lỗi tạo QR',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });

  // Verify và check-in bằng QR code (Staff)
  app.post(
    '/api/staff/qr-checkin',
    authenticateToken,
    authorizeRole('staff', 'admin'),
    async (req, res) => {
      const { qrData } = req.body;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Parse QR data
        let parsedData;
        try {
          parsedData =
            typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch {
          throw new Error('QR code không hợp lệ');
        }

        const { bookingId, bookingCode, signature, centerId } = parsedData;

        // Verify signature
        const expectedSignature = crypto
          .createHash('sha256')
          .update(`${bookingId}-${bookingCode}-${JWT_SECRET}`)
          .digest('hex')
          .slice(0, 16);

        if (signature !== expectedSignature) {
          throw new Error('QR code không hợp lệ hoặc đã bị giả mạo');
        }

        // Lấy thông tin booking
        const [[booking]] = await connection.query(
          `SELECT vb.*, v.name as vaccineName, ts.slotTime
          FROM VaccinationBookings vb
          LEFT JOIN Vaccines v ON vb.vaccineId = v.id
          LEFT JOIN TimeSlots ts ON vb.timeSlotId = ts.id
          WHERE vb.id = ? AND vb.bookingCode = ?`,
          [bookingId, bookingCode]
        );

        if (!booking) {
          throw new Error('Không tìm thấy lịch đặt');
        }

        // Kiểm tra trung tâm (staff chỉ check-in được booking của trung tâm mình)
        const [[staff]] = await connection.query(
          'SELECT centerId FROM Users WHERE id = ?',
          [req.user.id]
        );

        if (staff.centerId != booking.centerId) {
          throw new Error('Lịch đặt không thuộc trung tâm của bạn');
        }

        // Kiểm tra trạng thái
        if (booking.status === 'completed') {
          throw new Error('Lịch đặt đã hoàn thành trước đó');
        }

        if (booking.status === 'cancelled') {
          throw new Error('Lịch đặt đã bị hủy');
        }

        if (booking.status === 'no_show') {
          throw new Error('Lịch đặt đã bị đánh dấu không đến');
        }

        // Check-in
        await connection.execute(
          'UPDATE VaccinationBookings SET status = "confirmed" WHERE id = ?',
          [bookingId]
        );

        await connection.commit();

        // Gửi thông báo cho user
        await sendNotification(
          booking.userId,
          '✅ Check-in thành công qua QR',
          `Bé ${booking.childName} đã được check-in bằng QR code. Vui lòng chờ gọi số.`,
          'success'
        );

        // Broadcast cho staff khác
        broadcastToStaff(booking.centerId, {
          type: 'checked_in',
          bookingId: bookingId,
          centerId: booking.centerId,
          method: 'qr'
        });

        res.json({
          message: 'Check-in thành công!',
          booking: {
            id: booking.id,
            bookingCode: booking.bookingCode,
            childName: booking.childName,
            parentName: booking.parentName,
            vaccineName: booking.vaccineName || 'N/A',
            slotTime: booking.slotTime
          }
        });
      } catch (err) {
        await connection.rollback();
        console.error('QR check-in error:', err);
        res.status(400).json({ message: err.message });
      } finally {
        connection.release();
      }
    }
  );
};

module.exports = setupQrRoutes;

