// server.js - Backend TVNAdrenaline (Node.js + Express + MySQL) - FIXED VERSION
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const moment = require('moment');
const QRCode = require('qrcode');
const crypto = require('crypto');
require('dotenv').config();

// Route modules
const { router: paymentRouter, setPool: setPaymentPool } = require('./routes/payment.routes');
const setupAuthRoutes = require('./routes/auth.routes');
const setupPublicRoutes = require('./routes/public.routes');
const setupUserRoutes = require('./routes/user.routes');
const setupQrRoutes = require('./routes/qr.routes');
const setupAdminRoutes = require('./routes/admin.routes');
const setupStaffRoutes = require('./routes/staff.routes');

// Services
const SessionService = require('./services/session.service');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tvnadrenaline_super_secret_2025';

// Middleware
app.use(cors());
app.use(express.json());


// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'TVNAdrenaline',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
});

// Khởi tạo SessionService
const sessionService = new SessionService(pool);

setPaymentPool(pool);

// ==================== WEBSOCKET SETUP ====================
const clients = new Map(); // userId -> { ws, role, centerId }

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  let userId = null;
  let userRole = null;
  let sessionId = null;

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Xác thực token + session khi client gửi
      if (data.type === 'auth' && data.token && data.sessionToken && data.deviceId) {
        // 1. Verify JWT
        jwt.verify(data.token, JWT_SECRET, async (err, user) => {
          if (err) {
            ws.send(JSON.stringify({
              type: 'auth_failed',
              error: 'Token không hợp lệ'
            }));
            ws.close();
            return;
          }

          // 2. Verify Session
          const sessionData = await sessionService.verifySession(
            data.sessionToken,
            data.deviceId
          );

          if (!sessionData || sessionData.userId !== user.id) {
            ws.send(JSON.stringify({
              type: 'auth_failed',
              error: 'Session không hợp lệ hoặc đã hết hạn'
            }));
            ws.close();
            return;
          }

          // ✅ 3. KIỂM TRA THIẾT BỊ CŨ ĐÃ KẾT NỐI CHƯA
          const oldClient = clients.get(user.id);
          if (oldClient?.ws.readyState === WebSocket.OPEN) {
            // Đẩy thiết bị cũ ra
            oldClient.ws.send(JSON.stringify({
              type: 'force_logout',
              message: 'Tài khoản của bạn đã đăng nhập từ thiết bị khác'
            }));
            oldClient.ws.close();
            clients.delete(user.id);
            console.log(`Kicked out old WebSocket for user ${user.id}`);
          }

          userId = user.id;
          userRole = user.role;
          sessionId = sessionData.sessionId;

          let centerId = null;
          if (userRole === 'staff' || userRole === 'admin') {
            const [rows] = await pool.query(
              'SELECT centerId FROM Users WHERE id = ?',
              [userId]
            );
            if (rows[0]?.centerId) centerId = rows[0].centerId;
          }

          // ✅ Lưu client mới
          clients.set(userId, { ws, role: userRole, centerId, sessionId });

          ws.send(JSON.stringify({
            type: 'auth_success',
            userId,
            role: userRole
          }));

          console.log(`✅ User ${userId} (${userRole}) connected via WebSocket`);
        });
      }

      // Ping từ client
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }

    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`User ${userId} disconnected from WebSocket`);
    }
  });
});

setInterval(() => {
  sessionService.cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Heartbeat: Dọn client chết mỗi 30s
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Gửi cho 1 user
const sendNotification = async (userId, title, message, type = 'info') => {
  // Lưu vào DB trước
  let notificationId = null;
  try {
    const [result] = await pool.execute(
      `INSERT INTO Notifications (userId, title, message, type) VALUES (?, ?, ?, ?)`,
      [userId, title, message, type]
    );
    notificationId = result.insertId;
    console.log(`✅ Đã lưu thông báo vào DB: ID=${notificationId}, userId=${userId}`);
  } catch (err) {
    console.error('❌ Lỗi lưu thông báo vào DB:', err);
    return; // Không gửi real-time nếu không lưu được DB
  }

  // Gửi real-time qua WebSocket
  const payload = {
    type: 'new_notification',
    data: {
      id: notificationId, // Dùng ID thật từ DB
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    }
  };

  const client = clients.get(userId);
  if (client?.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(payload));
    console.log(`✅ Đã gửi thông báo real-time đến user ${userId}: ${title}`);
  } else {
    console.log(`⚠️ User ${userId} không online, chỉ lưu DB`);
  }
};

// ==================== REALTIME BROADCAST FUNCTIONS ====================

const broadcastToStaff = (centerId, message) => {
  let count = 0;
  clients.forEach((client, userId) => {
    if (client.ws.readyState === WebSocket.OPEN &&
        (client.role === 'admin' || client.centerId == centerId)) {
      client.ws.send(JSON.stringify(message));
      count++;
    }
  });
  if (count > 0) console.log(`Broadcast to ${count} staff tại trung tâm ${centerId}`);
};

const sendToUser = (userId, message) => {
  const client = clients.get(userId);
  if (client?.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(message));
  }
};

const broadcastSlotUpdate = (centerId, date) => {
  const msg = { type: 'slots_updated', centerId, date };
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg));
    }
  });
};

// ==================== JWT Middleware ====================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token không hợp lệ hoặc hết hạn' });
    req.user = user;
    next();
  });
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không đủ quyền truy cập' });
    }
    next();
  };
};

// ====================== CLEANUP JOBS ======================

// Dọn dẹp các slot bị tạm giữ quá hạn (chạy mỗi 2 phút)
setInterval(async () => {
  try {
    const [result] = await pool.execute(
      `UPDATE TimeSlots 
       SET tempReserved = 0, reservedBy = NULL, reservedUntil = NULL
       WHERE tempReserved = 1 AND reservedUntil < NOW()`
    );
    
    if (result.affectedRows > 0) {
      console.log(`[${new Date().toLocaleString('vi-VN')}] Đã dọn ${result.affectedRows} slot tạm giữ hết hạn`);
    }
  } catch (err) {
    console.error('Lỗi dọn slot tạm giữ:', err);
  }
}, 2 * 60 * 1000); // 2 phút


// ====================== ROUTE MODULE INITIALIZATION ======================

setupAuthRoutes({
  app,
  pool,
  jwt,
  JWT_SECRET,
  bcrypt,
  sessionService,
  clients,
  WebSocket,
  authenticateToken
});

setupPublicRoutes({
  app,
  pool,
  jwt,
  JWT_SECRET
});

setupUserRoutes({
  app,
  pool,
  moment,
  authenticateToken,
  sendNotification,
  broadcastToStaff,
  broadcastSlotUpdate
});

setupQrRoutes({
  app,
  pool,
  QRCode,
  crypto,
  JWT_SECRET,
  authenticateToken,
  authorizeRole,
  sendNotification,
  broadcastToStaff
});

setupAdminRoutes({
  app,
  pool,
  bcrypt,
  authenticateToken,
  authorizeRole
});

setupStaffRoutes({
  app,
  pool,
  moment,
  authenticateToken,
  authorizeRole,
  sendNotification,
  broadcastToStaff
});

app.use('/api/payment', paymentRouter);

// ====================== START SERVER ======================
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   TVNAdrenaline Backend + WebSocket REAL-TIME       ║
║   Port: ${PORT}                                            ║
║   WebSocket: ws://localhost:${PORT}                 ║
║   Started: ${new Date().toLocaleString('vi-VN')}             ║
╚═══════════════════════════════════════════════════════╝
  `);
});