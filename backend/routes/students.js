const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/students ─────────────────────────────────
   Admin/Teacher: list all students (with class name)
──────────────────────────────────────────────────────── */
router.get('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { class: cls, search } = req.query;
    let sql = `
      SELECT s.id, s.student_no, s.gender, s.parent_name, s.parent_phone, s.is_active,
             u.name, u.email,
             c.name AS class_name
      FROM students s
      JOIN users u   ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE 1=1`;
    const args = [];

    if (cls)    { sql += ' AND c.name = ?';      args.push(cls); }
    if (search) { sql += ' AND u.name LIKE ?';   args.push('%' + search + '%'); }
    sql += ' ORDER BY u.name';

    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/students/me ──────────────────────────────
   Student: own profile
──────────────────────────────────────────────────────── */
router.get('/me', authenticate, authorize('student'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT s.id, s.student_no, s.gender, s.dob, s.parent_name, s.parent_phone, s.address,
              u.name, u.email, u.title, u.initials,
              c.name AS class_name, c.level
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student profile not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/students/:id ─────────────────────────────
   Admin/Teacher: single student profile
──────────────────────────────────────────────────────── */
router.get('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT s.*, u.name, u.email, u.title, c.name AS class_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/students ────────────────────────────────
   Admin: add a new student (creates user + student profile)
──────────────────────────────────────────────────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, email, password, class_name, gender, parent_name, parent_phone, dob, address } = req.body;

  if (!name || !email || !password || !class_name) {
    return res.status(400).json({ error: 'name, email, password and class_name are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const bcrypt = require('bcryptjs');
    const hash   = await bcrypt.hash(password, 10);

    // Find class
    const [clsRows] = await conn.execute('SELECT id FROM classes WHERE name = ?', [class_name]);
    if (!clsRows[0]) { await conn.rollback(); return res.status(400).json({ error: 'Class not found.' }); }

    // Create user
    const [uResult] = await conn.execute(
      'INSERT INTO users (role, name, email, password, title, initials) VALUES (?,?,?,?,?,?)',
      ['student', name, email.toLowerCase(), hash, class_name + ' · 2024/2025', name.split(' ').map(w=>w[0]).join('').slice(0,3)]
    );

    // Count students for student_no
    const [cnt] = await conn.execute('SELECT COUNT(*) AS c FROM students');
    const studentNo = 'BFS/' + new Date().getFullYear() + '/' + String(cnt[0].c + 1).padStart(3, '0');

    await conn.execute(
      'INSERT INTO students (user_id, student_no, class_id, gender, parent_name, parent_phone, dob, address) VALUES (?,?,?,?,?,?,?,?)',
      [uResult.insertId, studentNo, clsRows[0].id, gender || null, parent_name || null, parent_phone || null, dob || null, address || null]
    );

    await conn.commit();
    res.status(201).json({ message: 'Student added.', student_no: studentNo });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists.' });
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    conn.release();
  }
});

/* ─── PATCH /api/students/:id ───────────────────────────
   Admin: update student profile
──────────────────────────────────────────────────────── */
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { class_name, gender, parent_name, parent_phone, dob, address, is_active } = req.body;

  try {
    const fields = [], args = [];
    if (class_name !== undefined) {
      const [c] = await db.execute('SELECT id FROM classes WHERE name = ?', [class_name]);
      if (!c[0]) return res.status(400).json({ error: 'Class not found.' });
      fields.push('class_id = ?'); args.push(c[0].id);
    }
    if (gender     !== undefined) { fields.push('gender = ?');       args.push(gender); }
    if (parent_name!== undefined) { fields.push('parent_name = ?');  args.push(parent_name); }
    if (parent_phone!==undefined) { fields.push('parent_phone = ?'); args.push(parent_phone); }
    if (dob        !== undefined) { fields.push('dob = ?');          args.push(dob); }
    if (address    !== undefined) { fields.push('address = ?');      args.push(address); }
    if (is_active  !== undefined) { fields.push('is_active = ?');    args.push(is_active ? 1 : 0); }

    if (!fields.length) return res.status(400).json({ error: 'No fields to update.' });

    args.push(req.params.id);
    await db.execute('UPDATE students SET ' + fields.join(', ') + ' WHERE id = ?', args);

    res.json({ message: 'Student updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
