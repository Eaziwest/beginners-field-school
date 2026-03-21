const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/teachers ─────────────────────────────────
   Admin: all teachers with their assigned class
──────────────────────────────────────────────────────── */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT t.id, t.phone, t.subject, t.joined_on,
             u.name, u.email, u.is_active,
             c.name AS class_name
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      LEFT JOIN classes c ON c.teacher_id = t.user_id
      WHERE 1=1`;
    const args = [];
    if (search) { sql += ' AND u.name LIKE ?'; args.push('%' + search + '%'); }
    sql += ' ORDER BY u.name';

    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/teachers/me ──────────────────────────────
   Teacher: own profile
──────────────────────────────────────────────────────── */
router.get('/me', authenticate, authorize('teacher'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT t.id, t.phone, t.subject, u.name, u.email, u.title, u.initials, c.name AS class_name, c.id AS class_id
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN classes c ON c.teacher_id = t.user_id
       WHERE t.user_id = ?`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Teacher profile not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/teachers/:id ─────────────────────────────
   Admin: single teacher detail
──────────────────────────────────────────────────────── */
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT t.*, u.name, u.email, u.is_active, c.name AS class_name
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN classes c ON c.teacher_id = t.user_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Teacher not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/teachers ────────────────────────────────
   Admin: add a new teacher
──────────────────────────────────────────────────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, phone, subject, class_name } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const bcrypt = require('bcryptjs');
    const hash   = await bcrypt.hash(password, 10);

    const [uResult] = await conn.execute(
      'INSERT INTO users (role, name, email, password, title, initials) VALUES (?,?,?,?,?,?)',
      ['teacher', name, email.toLowerCase(), hash, (subject || 'Teacher') + (class_name ? ' — ' + class_name : ''),
       name.split(' ').map(w=>w[0]).join('').slice(0,3)]
    );

    await conn.execute(
      'INSERT INTO teachers (user_id, phone, subject) VALUES (?,?,?)',
      [uResult.insertId, phone || null, subject || null]
    );

    if (class_name) {
      await conn.execute(
        'UPDATE classes SET teacher_id = ? WHERE name = ?',
        [uResult.insertId, class_name]
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Teacher added.' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: 'Server error.' });
  } finally {
    conn.release();
  }
});

/* ─── PATCH /api/teachers/:id ───────────────────────────
   Admin: update teacher info
──────────────────────────────────────────────────────── */
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { phone, subject, is_active } = req.body;
  try {
    const tFields = [], tArgs = [];
    if (phone   !== undefined) { tFields.push('phone = ?');   tArgs.push(phone); }
    if (subject !== undefined) { tFields.push('subject = ?'); tArgs.push(subject); }

    if (tFields.length) {
      const [t] = await db.execute('SELECT user_id FROM teachers WHERE id = ?', [req.params.id]);
      if (!t[0]) return res.status(404).json({ error: 'Teacher not found.' });
      tArgs.push(req.params.id);
      await db.execute('UPDATE teachers SET ' + tFields.join(', ') + ' WHERE id = ?', tArgs);
    }

    if (is_active !== undefined) {
      const [t] = await db.execute('SELECT user_id FROM teachers WHERE id = ?', [req.params.id]);
      if (t[0]) await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, t[0].user_id]);
    }

    res.json({ message: 'Teacher updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
