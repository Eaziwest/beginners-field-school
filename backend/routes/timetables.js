const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/timetables ───────────────────────────────
   Admin : all timetables summary
   Teacher: their own class timetable
   Student: their class timetable (approved only)
   Query: ?term=3&session=2024/2025
──────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  const { term = 3, session = '2024/2025' } = req.query;
  try {
    if (req.user.role === 'admin') {
      const [rows] = await db.execute(
        `SELECT tt.id, tt.term, tt.session, tt.status, tt.admin_note,
                tt.submitted_at, tt.reviewed_at,
                c.name  AS class_name, c.id AS class_id,
                u.name  AS teacher_name, u.id AS teacher_user_id
         FROM timetables tt
         JOIN classes c ON c.id = tt.class_id
         LEFT JOIN users u ON u.id = tt.teacher_id
         WHERE tt.term = ? AND tt.session = ?
         ORDER BY c.level, c.name`,
        [term, session]
      );
      return res.json(rows);
    }

    if (req.user.role === 'teacher') {
      const [rows] = await db.execute(
        `SELECT tt.*, c.name AS class_name
         FROM timetables tt
         JOIN classes c ON c.id = tt.class_id
         WHERE tt.teacher_id = ? AND tt.term = ? AND tt.session = ?
         LIMIT 1`,
        [req.user.id, term, session]
      );
      return res.json(rows[0] || null);
    }

    if (req.user.role === 'student') {
      const [rows] = await db.execute(
        `SELECT tt.rows_json, tt.status, tt.reviewed_at,
                c.name AS class_name, u.name AS teacher_name
         FROM timetables tt
         JOIN classes   c ON c.id  = tt.class_id
         LEFT JOIN users u ON u.id = tt.teacher_id
         WHERE tt.status = 'approved'
           AND tt.class_id = (SELECT class_id FROM students WHERE user_id = ? LIMIT 1)
           AND tt.term = ? AND tt.session = ?
         LIMIT 1`,
        [req.user.id, term, session]
      );
      return res.json(rows[0] || null);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/timetables/status ────────────────────────
   Student: what is the status of their class timetable?
   Returns: { status, class_name, teacher_name }
──────────────────────────────────────────────────────── */
router.get('/status', authenticate, authorize('student'), async (req, res) => {
  const { term = 3, session = '2024/2025' } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT tt.status, c.name AS class_name, u.name AS teacher_name
       FROM timetables tt
       JOIN classes   c ON c.id  = tt.class_id
       LEFT JOIN users u ON u.id = tt.teacher_id
       WHERE tt.class_id = (SELECT class_id FROM students WHERE user_id = ? LIMIT 1)
         AND tt.term = ? AND tt.session = ?
       LIMIT 1`,
      [req.user.id, term, session]
    );
    res.json(rows[0] || { status: 'none' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PUT /api/timetables ───────────────────────────────
   Teacher: create or update (upsert) their class timetable
   Body: { class_id, term, session, rows_json }
──────────────────────────────────────────────────────── */
router.put('/', authenticate, authorize('teacher'), async (req, res) => {
  const { class_id, term, session, rows_json } = req.body;

  if (!class_id || !term || !session || !rows_json) {
    return res.status(400).json({ error: 'class_id, term, session, and rows_json are required.' });
  }

  try {
    await db.execute(
      `INSERT INTO timetables (class_id, teacher_id, term, session, rows_json, status)
       VALUES (?, ?, ?, ?, ?, 'draft')
       ON DUPLICATE KEY UPDATE
         rows_json = VALUES(rows_json),
         teacher_id = VALUES(teacher_id),
         updated_at = NOW()`,
      [class_id, req.user.id, term, session, JSON.stringify(rows_json)]
    );
    res.json({ message: 'Timetable saved as draft.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/timetables/submit ──────────────────────
   Teacher: submit for admin approval
   Body: { class_id, term, session }
──────────────────────────────────────────────────────── */
router.patch('/submit', authenticate, authorize('teacher'), async (req, res) => {
  const { class_id, term, session } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT id, rows_json FROM timetables WHERE class_id = ? AND term = ? AND session = ?',
      [class_id, term, session]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Timetable not found. Save a draft first.' });

    await db.execute(
      `UPDATE timetables SET status = 'pending', submitted_at = NOW()
       WHERE class_id = ? AND term = ? AND session = ?`,
      [class_id, term, session]
    );
    res.json({ message: 'Timetable submitted for admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/timetables/:id/review ──────────────────
   Admin: approve or reject a timetable
   Body: { status: 'approved'|'rejected', admin_note? }
──────────────────────────────────────────────────────── */
router.patch('/:id/review', authenticate, authorize('admin'), async (req, res) => {
  const { status, admin_note } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
  }

  try {
    const [rows] = await db.execute('SELECT id FROM timetables WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Timetable not found.' });

    await db.execute(
      `UPDATE timetables
         SET status = ?, admin_note = ?, reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [status, admin_note || null, req.user.id, req.params.id]
    );
    res.json({ message: `Timetable ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
