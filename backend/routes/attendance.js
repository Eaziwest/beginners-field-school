const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/attendance ───────────────────────────────
   Teacher: get attendance for their class on a given date
   Query: ?date=2025-03-20&period=Morning Roll Call
──────────────────────────────────────────────────────── */
router.get('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { date, period, class_id } = req.query;

    let sql = `
      SELECT a.id, a.date, a.period, a.status, a.note,
             s.id AS student_id, s.student_no,
             u.name AS student_name
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN users    u ON u.id = s.user_id
      WHERE 1=1`;
    const args = [];

    if (date)     { sql += ' AND a.date = ?';     args.push(date); }
    if (period)   { sql += ' AND a.period = ?';   args.push(period); }
    if (class_id) { sql += ' AND a.class_id = ?'; args.push(class_id); }

    // Teachers can only see their own class
    if (req.user.role === 'teacher') {
      sql += ' AND s.class_id = (SELECT id FROM classes WHERE teacher_id = ? LIMIT 1)';
      args.push(req.user.id);
    }

    sql += ' ORDER BY u.name';
    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/attendance/student/:studentId ────────────
   Admin / Teacher / the student themselves: attendance history
──────────────────────────────────────────────────────── */
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    // Students can only see their own record
    if (req.user.role === 'student') {
      const [me] = await db.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!me[0] || me[0].id !== parseInt(req.params.studentId)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const [rows] = await db.execute(
      `SELECT date, period, status, note FROM attendance
       WHERE student_id = ? ORDER BY date DESC, period LIMIT 100`,
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/attendance ──────────────────────────────
   Teacher: save attendance records for a session
   Body: { date, period, class_id, records: [{student_id, status, note?}] }
──────────────────────────────────────────────────────── */
router.post('/', authenticate, authorize('teacher'), async (req, res) => {
  const { date, period, class_id, records } = req.body;

  if (!date || !period || !class_id || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'date, period, class_id and records[] are required.' });
  }

  try {
    // INSERT … ON DUPLICATE KEY UPDATE so re-saves are idempotent
    const values = records.map(r => [r.student_id, class_id, date, period, r.status, r.note || null, req.user.id]);

    await db.query(
      `INSERT INTO attendance (student_id, class_id, date, period, status, note, marked_by)
       VALUES ?
       ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note), marked_by = VALUES(marked_by)`,
      [values]
    );

    res.json({ message: 'Attendance saved.', count: records.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
