// routes/public.routes.js - Public read-only routes

const setupPublicRoutes = ({ app, pool, jwt, JWT_SECRET }) => {
  // ====================== PUBLIC ROUTES ======================

  app.get('/api/centers', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM VaccinationCenters WHERE isActive = 1`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get('/api/vaccines', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM Vaccines WHERE isActive = 1`
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ===== DEBUG: Route lấy khung giờ (có log cực mạnh) =====
  app.get('/api/timeslots/available', async (req, res) => {
    console.log('\n=== [DEBUG] /api/timeslots/available ĐƯỢC GỌI ===');
    console.log('Query params:', req.query);
    console.log(
      'Headers Authorization:',
      req.headers.authorization?.slice(0, 20) + '...'
    );

    const { centerId, date } = req.query;
    if (!centerId || !date) {
      console.log('Thiếu centerId hoặc date → 400');
      return res.status(400).json({ message: 'Thiếu centerId hoặc date' });
    }

    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
        console.log('Token hợp lệ → User ID:', currentUserId);
      } catch (err) {
        console.log('Token hết hạn hoặc sai → bỏ qua (không bắt buộc)');
      }
    } else {
      console.log('Không có token → currentUserId = null');
    }

    try {
      // BƯỚC 1: Kiểm tra có slot nào trong DB không?
      const [allSlots] = await pool.query(
        `SELECT COUNT(*) as total FROM TimeSlots WHERE centerId = ? AND slotDate = ?`,
        [centerId, date]
      );
      console.log(
        `Tổng slot trong DB cho center ${centerId} ngày ${date}:`,
        allSlots[0].total
      );

      if (allSlots[0].total === 0) {
        console.log('KHÔNG CÓ SLOT NÀO TRONG DB → trả về []');
        return res.json([]);
      }

      // BƯỚC 2: Query chính thức
      const [rows] = await pool.query(
        `SELECT 
           id,
           slotTime,
           isBooked,
           tempReserved,
           reservedBy,
           reservedUntil,
           CASE WHEN reservedBy = ? THEN 1 ELSE 0 END AS isReservedByMe
         FROM TimeSlots 
         WHERE centerId = ? 
           AND slotDate = ?
           AND isActive = 1
           AND isBooked = 0
           AND (
             tempReserved = 0 OR
             reservedBy = ? OR
             reservedUntil IS NULL OR
             reservedUntil < NOW()
           )
         ORDER BY slotTime`,
        [currentUserId || null, centerId, date, currentUserId || null]
      );

      console.log(`Query trả về ${rows.length} slot khả dụng`);
      rows.forEach((slot, i) => {
        console.log(
          `  Slot ${i + 1}: ${slot.slotTime.slice(0, 5)} | isBooked=${
            slot.isBooked
          } | tempReserved=${slot.tempReserved} | reservedBy=${
            slot.reservedBy
          } | isReservedByMe=${slot.isReservedByMe}`
        );
      });

      res.json(rows);
    } catch (err) {
      console.error('LỖI QUERY DATABASE:', err);
      res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
  });
};

module.exports = setupPublicRoutes;

