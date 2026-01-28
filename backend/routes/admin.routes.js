// routes/admin.routes.js - Admin management & dashboard

const setupAdminRoutes = ({ app, pool, bcrypt, authenticateToken, authorizeRole }) => {
  // ====================== ADMIN ROUTES ======================

  // 1. ADMIN DASHBOARD - Thống kê tổng quan
  app.get(
    '/api/admin/dashboard',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      try {
        // Tổng số users
        const [[userCount]] = await pool.query(
          `SELECT COUNT(*) as total FROM Users WHERE role = 'user'`
        );

        // Tổng số staff
        const [[staffCount]] = await pool.query(
          `SELECT COUNT(*) as total FROM Users WHERE role = 'staff'`
        );

        // Tổng số bookings
        const [[bookingCount]] = await pool.query(
          `SELECT COUNT(*) as total FROM VaccinationBookings`
        );

        // Bookings hôm nay
        const [[todayBookings]] = await pool.query(
          `SELECT COUNT(*) as total FROM VaccinationBookings 
           WHERE DATE(bookingDate) = CURDATE()`
        );

        // Bookings theo status
        const [statusStats] = await pool.query(
          `SELECT status, COUNT(*) as count FROM VaccinationBookings 
           GROUP BY status`
        );

        // Bookings 7 ngày gần nhất
        const [weeklyStats] = await pool.query(
          `SELECT DATE(bookingDate) as date, COUNT(*) as count 
           FROM VaccinationBookings 
           WHERE bookingDate >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           GROUP BY DATE(bookingDate)
           ORDER BY date ASC`
        );

        // Top vaccines
        const [topVaccines] = await pool.query(
          `SELECT v.name, COUNT(*) as count 
           FROM VaccinationBookings vb
           JOIN Vaccines v ON vb.vaccineId = v.id
           GROUP BY v.id
           ORDER BY count DESC
           LIMIT 5`
        );

        // Top centers
        const [topCenters] = await pool.query(
          `SELECT vc.name, COUNT(*) as count 
           FROM VaccinationBookings vb
           JOIN VaccinationCenters vc ON vb.centerId = vc.id
           GROUP BY vc.id
           ORDER BY count DESC
           LIMIT 5`
        );

        // Doanh thu ước tính (tháng này)
        const [[revenue]] = await pool.query(
          `SELECT SUM(v.price) as total
           FROM VaccinationBookings vb
           JOIN Vaccines v ON vb.vaccineId = v.id
           WHERE MONTH(vb.bookingDate) = MONTH(CURDATE())
             AND YEAR(vb.bookingDate) = YEAR(CURDATE())
             AND vb.status = 'completed'`
        );

        res.json({
          users: userCount.total,
          staff: staffCount.total,
          bookings: bookingCount.total,
          todayBookings: todayBookings.total,
          statusStats,
          weeklyStats,
          topVaccines,
          topCenters,
          revenue: revenue.total || 0
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // 2. QUẢN LÝ USERS
  app.get(
    '/api/admin/users',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { search, status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      try {
        let query = `SELECT id, name, phone, email, role, isActive, createdAt 
                     FROM Users WHERE role = 'user'`;
        let countQuery = `SELECT COUNT(*) as total FROM Users WHERE role = 'user'`;
        const params = [];
        const countParams = [];

        if (search) {
          query += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
          countQuery += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`);
          countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (status === 'active') {
          query += ` AND isActive = 1`;
          countQuery += ` AND isActive = 1`;
        } else if (status === 'inactive') {
          query += ` AND isActive = 0`;
          countQuery += ` AND isActive = 0`;
        }

        query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [users] = await pool.query(query, params);
        const [[{ total }]] = await pool.query(countQuery, countParams);

        res.json({
          users,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit)
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Khóa/Mở khóa user
  app.patch(
    '/api/admin/users/:id/toggle-status',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;

      try {
        const [[user]] = await pool.query(
          'SELECT isActive FROM Users WHERE id = ?',
          [id]
        );
        if (!user) {
          return res.status(404).json({ message: 'User không tồn tại' });
        }

        const newStatus = !user.isActive;
        await pool.execute(
          'UPDATE Users SET isActive = ? WHERE id = ?',
          [newStatus, id]
        );

        res.json({
          message: newStatus ? 'Đã mở khóa user' : 'Đã khóa user',
          isActive: newStatus
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // 3. QUẢN LÝ STAFF
  app.get(
    '/api/admin/staff',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      try {
        const [staff] = await pool.query(
          `SELECT u.*, vc.name as centerName 
           FROM Users u
           LEFT JOIN VaccinationCenters vc ON u.centerId = vc.id
           WHERE u.role = 'staff'
           ORDER BY u.createdAt DESC`
        );
        res.json(staff);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Thêm staff mới
  app.post(
    '/api/admin/staff',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { name, phone, email, password, centerId } = req.body;

      if (!name || !phone || !email || !password) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }

      try {
        const hashed = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
          `INSERT INTO Users (name, phone, email, password, role, centerId) 
           VALUES (?, ?, ?, ?, 'staff', ?)`,
          [name, phone, email, hashed, centerId || null]
        );

        res.status(201).json({
          message: 'Thêm staff thành công',
          staffId: result.insertId
        });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res
            .status(400)
            .json({ message: 'Email hoặc số điện thoại đã tồn tại' });
        }
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Cập nhật staff
  app.put(
    '/api/admin/staff/:id',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;
      const { name, phone, email, centerId } = req.body;

      try {
        await pool.execute(
          `UPDATE Users SET name = ?, phone = ?, email = ?, centerId = ? 
           WHERE id = ? AND role = 'staff'`,
          [name, phone, email, centerId || null, id]
        );

        res.json({ message: 'Cập nhật staff thành công' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Xóa staff
  app.delete(
    '/api/admin/staff/:id',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;

      try {
        await pool.execute(
          'DELETE FROM Users WHERE id = ? AND role = "staff"',
          [id]
        );
        res.json({ message: 'Xóa staff thành công' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // 4. QUẢN LÝ TRUNG TÂM
  app.get(
    '/api/admin/centers',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      try {
        const [centers] = await pool.query(
          `SELECT *, 
            (SELECT COUNT(*) FROM Users WHERE centerId = VaccinationCenters.id AND role = 'staff') as staffCount,
            (SELECT COUNT(*) FROM VaccinationBookings WHERE centerId = VaccinationCenters.id) as bookingCount
           FROM VaccinationCenters 
           ORDER BY createdAt DESC`
        );
        res.json(centers);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Thêm trung tâm
  app.post(
    '/api/admin/centers',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { name, address, phone, openHours, latitude, longitude } = req.body;

      if (!name || !address) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }

      try {
        const [result] = await pool.execute(
          `INSERT INTO VaccinationCenters (name, address, phone, openHours, latitude, longitude) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            name,
            address,
            phone || null,
            openHours || '07:30 - 17:30',
            latitude || null,
            longitude || null
          ]
        );

        res.status(201).json({
          message: 'Thêm trung tâm thành công',
          centerId: result.insertId
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Cập nhật trung tâm
  app.put(
    '/api/admin/centers/:id',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;
      const {
        name,
        address,
        phone,
        openHours,
        latitude,
        longitude,
        isActive
      } = req.body;

      try {
        await pool.execute(
          `UPDATE VaccinationCenters 
           SET name = ?, address = ?, phone = ?, openHours = ?, latitude = ?, longitude = ?, isActive = ?
           WHERE id = ?`,
          [name, address, phone, openHours, latitude, longitude, isActive, id]
        );

        res.json({ message: 'Cập nhật trung tâm thành công' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Xóa trung tâm (soft delete)
  app.delete(
    '/api/admin/centers/:id',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;

      try {
        await pool.execute(
          'UPDATE VaccinationCenters SET isActive = 0 WHERE id = ?',
          [id]
        );
        res.json({ message: 'Đã vô hiệu hóa trung tâm' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // 5. QUẢN LÝ VACCINE
  app.get(
    '/api/admin/vaccines',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      try {
        const [vaccines] = await pool.query(
          `SELECT v.*,
            (SELECT COUNT(*) FROM VaccinationBookings WHERE vaccineId = v.id) as bookingCount
           FROM Vaccines v 
           ORDER BY createdAt DESC`
        );
        res.json(vaccines);
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Thêm vaccine
  app.post(
    '/api/admin/vaccines',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const {
        name,
        shortName,
        manufacturer,
        targetAge,
        doseInfo,
        price,
        stock,
        description
      } = req.body;

      if (!name || !price) {
        return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
      }

      try {
        const [result] = await pool.execute(
          `INSERT INTO Vaccines (name, shortName, manufacturer, targetAge, doseInfo, price, stock, description) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            shortName,
            manufacturer,
            targetAge,
            doseInfo,
            price,
            stock || 0,
            description
          ]
        );

        res.status(201).json({
          message: 'Thêm vaccine thành công',
          vaccineId: result.insertId
        });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Cập nhật vaccine
  app.put(
    '/api/admin/vaccines/:id',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;
      const {
        name,
        shortName,
        manufacturer,
        targetAge,
        doseInfo,
        price,
        stock,
        description,
        isActive
      } = req.body;

      try {
        await pool.execute(
          `UPDATE Vaccines 
           SET name = ?, shortName = ?, manufacturer = ?, targetAge = ?, doseInfo = ?, 
               price = ?, stock = ?, description = ?, isActive = ?
           WHERE id = ?`,
          [
            name,
            shortName,
            manufacturer,
            targetAge,
            doseInfo,
            price,
            stock,
            description,
            isActive,
            id
          ]
        );

        res.json({ message: 'Cập nhật vaccine thành công' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );

  // Xóa vaccine (soft delete)
  app.delete(
    '/api/admin/vaccines/:id',
    authenticateToken,
    authorizeRole('admin'),
    async (req, res) => {
      const { id } = req.params;

      try {
        await pool.execute('UPDATE Vaccines SET isActive = 0 WHERE id = ?', [
          id
        ]);
        res.json({ message: 'Đã vô hiệu hóa vaccine' });
      } catch (err) {
        res.status(500).json({ message: err.message });
      }
    }
  );
};

module.exports = setupAdminRoutes;

