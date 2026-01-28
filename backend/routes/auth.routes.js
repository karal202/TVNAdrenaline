// routes/auth.routes.js - Auth & Account related routes

const setupAuthRoutes = ({
  app,
  pool,
  jwt,
  JWT_SECRET,
  bcrypt,
  sessionService,
  clients,
  WebSocket,
  authenticateToken
}) => {
  // ====================== AUTH ROUTES ======================

  app.post('/api/auth/register', async (req, res) => {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin đăng ký' });
    }

    try {
      const hashed = await bcrypt.hash(password, 12);
      const [result] = await pool.execute(
        `INSERT INTO Users (name, phone, email, password, role) VALUES (?, ?, ?, ?, 'user')`,
        [name, phone, email, hashed]
      );

      const userId = result.insertId;
      const token = jwt.sign(
        { id: userId, role: 'user', name },
        JWT_SECRET,
        { expiresIn: 7 * 24 * 60 * 60 }
      );

      res.status(201).json({
        message: 'Đăng ký thành công',
        token,
        user: { id: userId, name, phone, email, role: 'user' }
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Số điện thoại hoặc email đã tồn tại' });
      }
      console.error('Register error:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { emailOrPhone, password, deviceId, userAgent, ipAddress } = req.body;

    try {
      const [rows] = await pool.execute(
        `SELECT * FROM Users WHERE email = ? OR phone = ?`,
        [emailOrPhone, emailOrPhone]
      );
      const user = rows[0];

      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Sai email/số điện thoại hoặc mật khẩu' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Tài khoản bị khóa' });
      }

      // ✅ TẠO JWT TOKEN
      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: 7 * 24 * 60 * 60 }
      );

      // ✅ TẠO SESSION MỚI (sẽ tự động kick session cũ)
      const deviceInfo = {
        deviceId: deviceId || req.headers['x-device-id'] || 'unknown',
        userAgent: userAgent || req.headers['user-agent'] || 'unknown',
        ipAddress: ipAddress || req.ip || req.connection.remoteAddress || '0.0.0.0'
      };

      const { sessionToken, expiresAt } = await sessionService.createSession(
        user.id,
        deviceInfo
      );

      // ✅ GỬI THÔNG BÁO ĐẨY THIẾT BỊ CŨ RA (nếu có)
      const oldClient = clients.get(user.id);
      if (oldClient?.ws.readyState === WebSocket.OPEN) {
        oldClient.ws.send(JSON.stringify({
          type: 'force_logout',
          message: 'Tài khoản của bạn đã đăng nhập từ thiết bị khác'
        }));
        oldClient.ws.close();
        clients.delete(user.id);
        console.log(`🚫 Kicked out old device for user ${user.id}`);
      }

      res.json({
        message: 'Đăng nhập thành công',
        token,
        sessionToken, // ✅ Gửi sessionToken cho client
        expiresAt,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          phone: user.phone
        }
      });

    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Lỗi server' });
    }
  });

  app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    const { sessionToken, deviceId } = req.body;

    try {
      // Xóa session
      await sessionService.deleteSession(
        sessionToken,
        deviceId || req.headers['x-device-id'] || 'unknown'
      );

      // Ngắt WebSocket
      const client = clients.get(req.user.id);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
        clients.delete(req.user.id);
      }

      res.json({ message: 'Đăng xuất thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi đăng xuất' });
    }
  });

  app.get('/api/my/sessions', authenticateToken, async (req, res) => {
    try {
      const sessions = await sessionService.getActiveSessions(req.user.id);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Đăng xuất tất cả thiết bị
  app.post('/api/auth/logout-all', authenticateToken, async (req, res) => {
    try {
      await sessionService.deleteAllSessions(req.user.id);

      // Kick WebSocket
      const client = clients.get(req.user.id);
      if (client?.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
        clients.delete(req.user.id);
      }

      res.json({ message: 'Đã đăng xuất tất cả thiết bị' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi đăng xuất' });
    }
  });

  // Lấy thông tin user hiện tại
  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, phone, email, role FROM Users WHERE id = ?',
        [req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: 'User không tồn tại' });
      }

      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // ================== HỒ SƠ & BẢO MẬT TÀI KHOẢN ==================

  // Cập nhật thông tin cá nhân
  app.patch('/api/auth/me', authenticateToken, async (req, res) => {
    const { name, phone } = req.body;
    try {
      await pool.execute(
        'UPDATE Users SET name = ?, phone = ? WHERE id = ?',
        [name, phone, req.user.id]
      );
      const [rows] = await pool.query(
        'SELECT id, name, phone, email, role FROM Users WHERE id = ?',
        [req.user.id]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Cập nhật thất bại' });
    }
  });

  // Đổi mật khẩu
  app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
      const [rows] = await pool.query(
        'SELECT password FROM Users WHERE id = ?',
        [req.user.id]
      );
      const user = rows[0];
      if (!user || !await bcrypt.compare(currentPassword, user.password)) {
        return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await pool.execute(
        'UPDATE Users SET password = ? WHERE id = ?',
        [hashed, req.user.id]
      );
      res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  });

  // Xóa tài khoản (hard delete hiện tại)
  app.delete('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      await pool.execute('DELETE FROM Users WHERE id = ?', [req.user.id]);
      res.json({ message: 'Xóa tài khoản thành công' });
    } catch (err) {
      res.status(500).json({ message: 'Không thể xóa tài khoản' });
    }
  });
};

module.exports = setupAuthRoutes;

