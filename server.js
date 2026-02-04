require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Server-Sent Events (SSE) clients
const adminSseClients = [];
const userSseClients = new Map(); // userId -> [res,...]

function sendSse(res, event, data) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    // connection probably closed
  }
}

function broadcastToAdmins(event, data) {
  for (const res of adminSseClients.slice()) {
    sendSse(res, event, data);
  }
}

function notifyUser(userId, event, data) {
  const list = userSseClients.get(String(userId)) || [];
  for (const res of list.slice()) {
    sendSse(res, event, data);
  }
}

// Email transporter (configure with your email provider)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email config (optional)
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify((err, success) => {
    if (err) console.warn('Email config issue:', err.message);
    else console.log('Email service ready');
  });
}

// Send email helper
async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER) {
    console.warn('Email not configured, skipping:', subject);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log('Email sent:', subject);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

// Audit logging helper
async function logAudit(userId, action, tableName, recordId, details) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId || null, action, tableName || null, recordId || null, JSON.stringify(details) || null]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// Middleware: verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'hospital-management.html'));
});

// ===== AUTH ROUTES =====

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password, full_name, role, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, username, email, full_name, role, status, created_at`,
      [username, email, hashedPassword, fullName, role || 'staff']
    );

    const user = result.rows[0];
    await logAudit(user.id, 'SIGNUP', 'users', user.id, { username, email, role: role || 'staff' });

    // Send approval request email to admin
    await sendEmail(
      process.env.ADMIN_EMAIL || 'admin@mmgh.local',
      'New User Registration Approval Needed',
      `<h2>New User Registration</h2>
       <p><strong>${fullName}</strong> (${username}) has requested access as <strong>${role || 'staff'}</strong>.</p>
       <p>Email: ${email}</p>
       <p>Please log in to approve or reject this user.</p>`
    );

    // Notify connected admin clients (real-time)
    try {
      broadcastToAdmins('new_pending_user', {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      });
    } catch (err) {
      console.warn('SSE broadcast to admins failed:', err && err.message);
    }

    res.json({ 
      message: 'Registration successful! Please wait for admin approval.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message.includes('duplicate') ? 'Username or email already exists' : 'Signup failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await db.query(
      `SELECT id, username, email, full_name, role, status, password FROM users WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Account has been rejected' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    await logAudit(user.id, 'LOGIN', 'users', user.id, {});

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ===== ADMIN ROUTES =====

// Get pending users (admin only)
app.get('/api/admin/pending-users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const result = await db.query(
      `SELECT id, username, email, full_name, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve user (admin only)
app.post('/api/admin/approve-user/:userId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { userId } = req.params;
    const userResult = await db.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    await db.query(
      `UPDATE users SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1 WHERE id = $2`,
      [req.user.username, userId]
    );

    await logAudit(req.user.id, 'APPROVED_USER', 'users', userId, { approvedUser: user.email });

    // Send approval email
    await sendEmail(
      user.email,
      'Your Account has been Approved',
      `<h2>Welcome to MMGH!</h2>
       <p>Hi ${user.full_name},</p>
       <p>Your account has been approved and you can now log in to the system.</p>
       <p>Visit: ${process.env.APP_URL || 'http://localhost:3000'}</p>`
    );

    // Notify specific user (if connected) and broadcast status change
    try {
      notifyUser(userId, 'approved', { message: 'Your account has been approved' });
      broadcastToAdmins('user_status_changed', { id: userId, status: 'approved' });
    } catch (err) {
      console.warn('SSE notify on approve failed:', err && err.message);
    }

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Reject user (admin only)
app.post('/api/admin/reject-user/:userId', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { userId } = req.params;
    const reason = req.body.reason || 'No reason provided';
    const userResult = await db.query('SELECT email, full_name FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    await db.query(
      `UPDATE users SET status = 'rejected', approved_at = CURRENT_TIMESTAMP, approved_by = $1 WHERE id = $2`,
      [req.user.username, userId]
    );

    await logAudit(req.user.id, 'REJECTED_USER', 'users', userId, { reason });

    // Send rejection email
    await sendEmail(
      user.email,
      'Account Registration Rejected',
      `<h2>Registration Status</h2>
       <p>Hi ${user.full_name},</p>
       <p>Unfortunately, your registration request has been rejected.</p>
       <p>Reason: ${reason}</p>
       <p>Contact the administrator for more information.</p>`
    );

    // Notify specific user (if connected) and broadcast status change
    try {
      notifyUser(userId, 'rejected', { message: 'Your account registration was rejected', reason });
      broadcastToAdmins('user_status_changed', { id: userId, status: 'rejected' });
    } catch (err) {
      console.warn('SSE notify on reject failed:', err && err.message);
    }

    res.json({ message: 'User rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const result = await db.query(
      `SELECT id, username, email, full_name, role, status, created_at, approved_at FROM users ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get audit logs (admin only)
app.get('/api/admin/audit-logs', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const limit = req.query.limit || 100;
    const result = await db.query(
      `SELECT al.id, al.user_id, al.action, al.table_name, al.record_id, al.details, al.created_at, u.username
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ===== DATA ROUTES =====

// GET all data
app.get('/api/data', async (req, res) => {
  try {
    const patients = (await db.query('SELECT * FROM patients ORDER BY id')).rows;
    const appointments = (await db.query('SELECT * FROM appointments ORDER BY id')).rows;
    const records = (await db.query('SELECT * FROM records ORDER BY id')).rows;
    const staff = (await db.query('SELECT * FROM staff ORDER BY id')).rows;
    res.json({ patients, appointments, records, staff });
  } catch (err) {
    console.error('Error fetching data', err);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Server-Sent Events endpoint for real-time notifications
app.get('/events', (req, res) => {
  let { role, userId, token } = req.query;

  // If token provided, verify and derive role/userId
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      role = decoded.role;
      // if user role, derive userId from token
      if (decoded && decoded.id) userId = decoded.id;
    } catch (err) {
      console.warn('SSE token verify failed:', err && err.message);
      // continue without token-derived identity
    }
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // Send initial ping
  sendSse(res, 'connected', { role: role || 'guest', timestamp: Date.now() });

  if (role === 'admin') {
    adminSseClients.push(res);
  } else if (userId) {
    const key = String(userId);
    const list = userSseClients.get(key) || [];
    list.push(res);
    userSseClients.set(key, list);
  }

  // Cleanup on close
  req.on('close', () => {
    try {
      if (role === 'admin') {
        const idx = adminSseClients.indexOf(res);
        if (idx !== -1) adminSseClients.splice(idx, 1);
      }
      if (userId) {
        const key = String(userId);
        const list = userSseClients.get(key) || [];
        const idx = list.indexOf(res);
        if (idx !== -1) {
          list.splice(idx, 1);
          if (list.length === 0) userSseClients.delete(key);
          else userSseClients.set(key, list);
        }
      }
    } catch (err) {
      // ignore
    }
  });
});

// Bulk replace (overwrite)
app.post('/api/bulk', async (req, res) => {
  const { patients = [], appointments = [], records = [], staff = [] } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE appointments, records, staff, patients RESTART IDENTITY CASCADE');

    for (const p of patients) {
      await client.query(
        `INSERT INTO patients(id, first_name, last_name, dob, gender, phone, address, emergency_contact, blood_group, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [p.id, p.firstName, p.lastName, p.dob, p.gender, p.phone, p.address, p.emergencyContact, p.bloodGroup, p.status]
      );
    }

    for (const a of appointments) {
      await client.query(
        `INSERT INTO appointments(id, patient_id, patient_name, doctor, date, time, reason, status, notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [a.id, a.patientId || a.patient_id, a.patientName || a.patient_name, a.doctor, a.date, a.time, a.reason, a.status, a.notes]
      );
    }

    for (const r of records) {
      await client.query(
        `INSERT INTO records(id, patient_id, patient_name, doctor, date, diagnosis, treatment, prescription, vitals, notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [r.id, r.patientId || r.patient_id, r.patientName || r.patient_name, r.doctor, r.date, r.diagnosis, r.treatment, r.prescription, r.vitals, r.notes]
      );
    }

    for (const s of staff) {
      await client.query(
        `INSERT INTO staff(id, first_name, last_name, role, department, phone, email, address, join_date, status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [s.id, s.firstName, s.lastName, s.role, s.department, s.phone, s.email, s.address, s.joinDate || s.join_date, s.status]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk save error', err);
    res.status(500).json({ error: 'Bulk save failed' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
