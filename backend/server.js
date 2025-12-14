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

// ==================== WEBSOCKET SETUP ====================
const clients = new Map(); // userId -> { ws, role, centerId }

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  let userId = null;
  let userRole = null;

  ws.isAlive = true;

  // Ping-pong để giữ kết nối sống
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Xác thực token khi client gửi
      if (data.type === 'auth' && data.token) {
        jwt.verify(data.token, JWT_SECRET, async (err, user) => {
          if (err) {
            ws.send(JSON.stringify({ type: 'auth_failed', error: 'Token không hợp lệ' }));
            ws.close();
            return;
          }

          userId = user.id;
          userRole = user.role;

          let centerId = null;
          if (userRole === 'staff' || userRole === 'admin') {
            const [rows] = await pool.query('SELECT centerId FROM Users WHERE id = ?', [userId]);
            if (rows[0]?.centerId) centerId = rows[0].centerId;
          }

          clients.set(userId, { ws, role: userRole, centerId });
          ws.send(JSON.stringify({ type: 'auth_success', userId, role: userRole }));
          console.log(`User ${userId} (${userRole}) đã kết nối WebSocket`);
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
      console.log(`User ${userId} ngắt kết nối WebSocket`);
    }
  });
});


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
  const { emailOrPhone, password } = req.body;
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM Users WHERE email = ? OR phone = ?`,
      [emailOrPhone, emailOrPhone]
    );
    const user = rows[0];
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Sai email/số điện thoại hoặc mật khẩu' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Tài khoản bị khóa' });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: 7 * 24 * 60 * 60 }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: { id: user.id, name: user.name, role: user.role, phone: user.phone }
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ====================== PUBLIC ROUTES ======================
app.get('/api/centers', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM VaccinationCenters WHERE isActive = 1`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/vaccines', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM Vaccines WHERE isActive = 1`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===== DEBUG: Route lấy khung giờ (có log cực mạnh) =====
app.get('/api/timeslots/available', async (req, res) => {
  console.log('\n=== [DEBUG] /api/timeslots/available ĐƯỢC GỌI ===');
  console.log('Query params:', req.query);
  console.log('Headers Authorization:', req.headers.authorization?.slice(0, 20) + '...');

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
    console.log(`Tổng slot trong DB cho center ${centerId} ngày ${date}:`, allSlots[0].total);

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
      console.log(`  Slot ${i + 1}: ${slot.slotTime.slice(0,5)} | isBooked=${slot.isBooked} | tempReserved=${slot.tempReserved} | reservedBy=${slot.reservedBy} | isReservedByMe=${slot.isReservedByMe}`);
    });

    res.json(rows);
  } catch (err) {
    console.error('LỖI QUERY DATABASE:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
});

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
      return res.status(400).json({ message: 'Khung giờ đã được đặt hoặc đang được giữ' });
    }

    await connection.commit();

    // Real-time: thông báo slot bị giữ
    const [[slot]] = await pool.query('SELECT centerId, slotDate FROM TimeSlots WHERE id = ?', [timeSlotId]);
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
      return res.status(400).json({ message: 'Bạn không đang giữ khung giờ này' });
    }

    // Real-time update
    const [[slot]] = await pool.query('SELECT centerId, slotDate FROM TimeSlots WHERE id = ?', [timeSlotId]);
    broadcastSlotUpdate(slot.centerId, slot.slotDate);

    res.json({ message: 'Đã bỏ giữ chỗ', timeSlotId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Đặt lịch chính thức
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const {
    childName, childBirthDate, childGender, parentName, parentPhone,
    vaccineId, doseNumber = 1, centerId, timeSlotId, notes
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Lấy thông tin slot với slotDate và slotTime
    const [[slot]] = await connection.query(
      `SELECT * FROM TimeSlots WHERE id = ? AND isActive = 1 FOR UPDATE`, 
      [timeSlotId]
    );

    if (!slot || slot.centerId != centerId || slot.isBooked ||
        (slot.tempReserved && slot.reservedBy !== req.user.id)) {
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
      [bookingCode, req.user.id, childName, childBirthDate, childGender,
       parentName, parentPhone, vaccineId, doseNumber, centerId, timeSlotId, notes || null]
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

    res.json({ message: 'Đặt lịch thành công!', bookingCode });
  } catch (err) {
    await connection.rollback();
    console.error('Lỗi đặt lịch:', err);
    res.status(400).json({ message: err.message });
  } finally {
    connection.release();
  }
});

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
      return res.status(400).json({ message: 'QR chỉ khả dụng cho lịch pending hoặc confirmed' });
    }

    // Tạo QR payload
    const qrPayload = {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      childName: booking.childName,
      centerId: booking.centerId,
      timestamp: Date.now(),
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
app.post('/api/staff/qr-checkin', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { qrData } = req.body;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Parse QR data
    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
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
      return res.status(400).json({ 
        message: 'Chỉ được hủy trước 24h' 
      });
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

app.post('/api/staff/send-notification', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { userId, title, message, type = 'info' } = req.body;
  
  if (!userId || !title || !message) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  
  try {
    // Kiểm tra user có tồn tại không
    const [[user]] = await pool.query('SELECT id, name FROM Users WHERE id = ?', [userId]);
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
});

// Lấy danh sách user để gửi thông báo (Staff/Admin)
app.get('/api/staff/users', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { search } = req.query;
  
  try {
    const [[staff]] = await pool.query('SELECT centerId FROM Users WHERE id = ?', [req.user.id]);
    
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

// ====================== ADMIN ROUTES - THÊM VÀO server.js ======================

// 1. ADMIN DASHBOARD - Thống kê tổng quan
app.get('/api/admin/dashboard', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// 2. QUẢN LÝ USERS
app.get('/api/admin/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// Khóa/Mở khóa user
app.patch('/api/admin/users/:id/toggle-status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    const [[user]] = await pool.query('SELECT isActive FROM Users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ message: 'User không tồn tại' });
    
    const newStatus = !user.isActive;
    await pool.execute('UPDATE Users SET isActive = ? WHERE id = ?', [newStatus, id]);
    
    res.json({ 
      message: newStatus ? 'Đã mở khóa user' : 'Đã khóa user',
      isActive: newStatus
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. QUẢN LÝ STAFF
app.get('/api/admin/staff', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// Thêm staff mới
app.post('/api/admin/staff', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
      return res.status(400).json({ message: 'Email hoặc số điện thoại đã tồn tại' });
    }
    res.status(500).json({ message: err.message });
  }
});

// Cập nhật staff
app.put('/api/admin/staff/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// Xóa staff
app.delete('/api/admin/staff/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.execute('DELETE FROM Users WHERE id = ? AND role = "staff"', [id]);
    res.json({ message: 'Xóa staff thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. QUẢN LÝ TRUNG TÂM
app.get('/api/admin/centers', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// Thêm trung tâm
app.post('/api/admin/centers', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { name, address, phone, openHours, latitude, longitude } = req.body;
  
  if (!name || !address) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  
  try {
    const [result] = await pool.execute(
      `INSERT INTO VaccinationCenters (name, address, phone, openHours, latitude, longitude) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, address, phone || null, openHours || '07:30 - 17:30', latitude || null, longitude || null]
    );
    
    res.status(201).json({ 
      message: 'Thêm trung tâm thành công',
      centerId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cập nhật trung tâm
app.put('/api/admin/centers/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, openHours, latitude, longitude, isActive } = req.body;
  
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
});

// Xóa trung tâm (soft delete)
app.delete('/api/admin/centers/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.execute('UPDATE VaccinationCenters SET isActive = 0 WHERE id = ?', [id]);
    res.json({ message: 'Đã vô hiệu hóa trung tâm' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. QUẢN LÝ VACCINE
app.get('/api/admin/vaccines', authenticateToken, authorizeRole('admin'), async (req, res) => {
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
});

// Thêm vaccine
app.post('/api/admin/vaccines', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { name, shortName, manufacturer, targetAge, doseInfo, price, stock, description } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }
  
  try {
    const [result] = await pool.execute(
      `INSERT INTO Vaccines (name, shortName, manufacturer, targetAge, doseInfo, price, stock, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, shortName, manufacturer, targetAge, doseInfo, price, stock || 0, description]
    );
    
    res.status(201).json({ 
      message: 'Thêm vaccine thành công',
      vaccineId: result.insertId
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cập nhật vaccine
app.put('/api/admin/vaccines/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, shortName, manufacturer, targetAge, doseInfo, price, stock, description, isActive } = req.body;
  
  try {
    await pool.execute(
      `UPDATE Vaccines 
       SET name = ?, shortName = ?, manufacturer = ?, targetAge = ?, doseInfo = ?, 
           price = ?, stock = ?, description = ?, isActive = ?
       WHERE id = ?`,
      [name, shortName, manufacturer, targetAge, doseInfo, price, stock, description, isActive, id]
    );
    
    res.json({ message: 'Cập nhật vaccine thành công' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Xóa vaccine (soft delete)
app.delete('/api/admin/vaccines/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.execute('UPDATE Vaccines SET isActive = 0 WHERE id = ?', [id]);
    res.json({ message: 'Đã vô hiệu hóa vaccine' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================== THÊM MỚI: CẬP NHẬT HỒ SƠ, ĐỔI MẬT KHẨU, XÓA TÀI KHOẢN ==================

// Cập nhật thông tin cá nhân
app.patch('/api/auth/me', authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  try {
    await pool.execute(
      'UPDATE Users SET name = ?, phone = ? WHERE id = ?',
      [name, phone, req.user.id]
    );
    const [rows] = await pool.query('SELECT id, name, phone, email, role FROM Users WHERE id = ?', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Cập nhật thất bại' });
  }
});

// Đổi mật khẩu
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const [rows] = await pool.query('SELECT password FROM Users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user || !await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE Users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xóa tài khoản (chỉ xóa mềm hoặc để lại log, tùy bạn)
app.delete('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM Users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Xóa tài khoản thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Không thể xóa tài khoản' });
  }
});

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


// ====================== STAFF ROUTES (thêm vào server.js) ======================

// Lấy thông tin staff hiện tại (bao gồm centerId)
app.get('/api/staff/me', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
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
});

// Xem bookings của trung tâm mình (Staff)
app.get('/api/staff/bookings', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
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
});

// Check-in khách hàng (chuyển pending → confirmed)
app.patch('/api/staff/bookings/:id/checkin', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[booking]] = await connection.query('SELECT * FROM VaccinationBookings WHERE id = ?', [id]);
    if (!booking) throw new Error('Không tìm thấy lịch');

    await connection.execute('UPDATE VaccinationBookings SET status = "confirmed" WHERE id = ?', [id]);
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
});

// Hoàn thành tiêm (Staff version)
app.post('/api/staff/bookings/:id/complete', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { id } = req.params;
  const { batchNumber } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[booking]] = await connection.query('SELECT * FROM VaccinationBookings WHERE id = ?', [id]);
    if (!booking) throw new Error('Không tìm thấy lịch');

    await connection.execute('UPDATE VaccinationBookings SET status = "completed", paymentStatus = "paid" WHERE id = ?', [id]);
    await connection.commit();

    // ✅ GỬI THÔNG BÁO REAL-TIME CHO USER
    await sendNotification(
      booking.userId,
      '🎉 Tiêm thành công!',
      `Bé ${booking.childName} đã được tiêm thành công! Số lô: ${batchNumber || 'N/A'}. Cảm ơn quý phụ huynh đã tin tưởng!`,
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
});

// ==================== NO-SHOW → GỬI THÔNG BÁO ====================
app.patch('/api/staff/bookings/:id/no-show', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[booking]] = await connection.query('SELECT * FROM VaccinationBookings WHERE id = ?', [id]);
    if (!booking) throw new Error('Không tìm thấy lịch');

    await connection.execute('UPDATE VaccinationBookings SET status = "no_show" WHERE id = ?', [id]);
    await connection.execute('UPDATE TimeSlots SET isBooked = 0, bookedBy = NULL WHERE id = ?', [booking.timeSlotId]);
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
});

// Thống kê của staff (trung tâm mình)
app.get('/api/staff/stats', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { date } = req.query;
  const targetDate = date || moment().format('YYYY-MM-DD');
  
  try {
    const [[staff]] = await pool.query('SELECT centerId FROM Users WHERE id = ?', [req.user.id]);
    
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
});

// Tìm kiếm booking (staff)
app.get('/api/staff/search', authenticateToken, authorizeRole('staff', 'admin'), async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 3) {
    return res.status(400).json({ message: 'Vui lòng nhập ít nhất 3 ký tự' });
  }
  
  try {
    const [[staff]] = await pool.query('SELECT centerId FROM Users WHERE id = ?', [req.user.id]);
    
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
      [staff.centerId, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]
    );
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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