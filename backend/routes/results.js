const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* helper — compute grade from total */
function computeGrade(total) {
  if (total >= 75) return { grade: 'A', remark: 'Excellent' };
  if (total >= 60) return { grade: 'B', remark: 'Very Good' };
  if (total >= 50) return { grade: 'C', remark: 'Good' };
  if (total >= 40) return { grade: 'D', remark: 'Fair' };
  return               { grade: 'F', remark: 'Needs Improvement' };
}

/* ─── GET /api/results ──────────────────────────────────
   Admin: all results  |  Teacher: their class  |  Student: own
   Query: ?term=3&session=2024/2025&class_id=9&status=submitted
──────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  try {
    const { term, session, class_id, status } = req.query;
    let sql = `
      SELECT r.id, r.term, r.session, r.ca_score, r.exam_score, r.total, r.grade, r.remark, r.status,
             s.student_no,
             u.name AS student_name,
             c.name AS class_name,
             sub.name AS subject_name
      FROM results r
      JOIN students s   ON s.id = r.student_id
      JOIN users    u   ON u.id = s.user_id
      LEFT JOIN classes c    ON c.id = r.class_id
      LEFT JOIN subjects sub ON sub.id = r.subject_id
      WHERE 1=1`;
    const args = [];

    if (term)     { sql += ' AND r.term = ?';     args.push(term); }
    if (session)  { sql += ' AND r.session = ?';  args.push(session); }
    if (class_id) { sql += ' AND r.class_id = ?'; args.push(class_id); }
    if (status)   { sql += ' AND r.status = ?';   args.push(status); }

    // Role restrictions
    if (req.user.role === 'teacher') {
      sql += ' AND r.class_id = (SELECT id FROM classes WHERE teacher_id = ? LIMIT 1)';
      args.push(req.user.id);
    }
    if (req.user.role === 'student') {
      sql += ' AND s.user_id = ? AND r.status = "published"';
      args.push(req.user.id);
    }

    sql += ' ORDER BY u.name, sub.name';
    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/results/bulk ────────────────────────────
   Teacher: upload/update scores for a whole class-subject
   Body: { class_id, subject_id, term, session, scores: [{student_id, ca_score, exam_score}] }
──────────────────────────────────────────────────────── */
router.post('/bulk', authenticate, authorize('teacher'), async (req, res) => {
  const { class_id, subject_id, term, session, scores } = req.body;

  if (!class_id || !subject_id || !term || !session || !Array.isArray(scores)) {
    return res.status(400).json({ error: 'class_id, subject_id, term, session, and scores[] are required.' });
  }

  try {
    const values = scores.map(sc => {
      const total = (parseFloat(sc.ca_score) || 0) + (parseFloat(sc.exam_score) || 0);
      const { grade, remark } = computeGrade(total);
      return [sc.student_id, class_id, subject_id, term, session,
              sc.ca_score, sc.exam_score, grade, remark, req.user.id, 'draft'];
    });

    await db.query(
      `INSERT INTO results
         (student_id, class_id, subject_id, term, session, ca_score, exam_score, grade, remark, uploaded_by, status)
       VALUES ?
       ON DUPLICATE KEY UPDATE
         ca_score = VALUES(ca_score), exam_score = VALUES(exam_score),
         grade = VALUES(grade), remark = VALUES(remark),
         uploaded_by = VALUES(uploaded_by)`,
      [values]
    );

    res.json({ message: 'Scores saved.', count: scores.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/results/submit ─────────────────────────
   Teacher: submit a class-subject result set for approval
   Body: { class_id, subject_id, term, session }
──────────────────────────────────────────────────────── */
router.patch('/submit', authenticate, authorize('teacher'), async (req, res) => {
  const { class_id, subject_id, term, session } = req.body;
  try {
    await db.execute(
      `UPDATE results SET status = 'submitted'
       WHERE class_id = ? AND subject_id = ? AND term = ? AND session = ? AND status = 'draft'`,
      [class_id, subject_id, term, session]
    );
    res.json({ message: 'Results submitted for admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/results/publish ────────────────────────
   Admin: approve and publish results
   Body: { class_id, term, session }  (or subject_id to be specific)
──────────────────────────────────────────────────────── */
router.patch('/publish', authenticate, authorize('admin'), async (req, res) => {
  const { class_id, subject_id, term, session } = req.body;
  try {
    let sql  = `UPDATE results SET status = 'published' WHERE class_id = ? AND term = ? AND session = ?`;
    const args = [class_id, term, session];
    if (subject_id) { sql += ' AND subject_id = ?'; args.push(subject_id); }

    await db.execute(sql, args);
    res.json({ message: 'Results published.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/results/reject ─────────────────────────
   Admin: reject submitted results — sends back to draft
──────────────────────────────────────────────────────── */
router.patch('/reject', authenticate, authorize('admin'), async (req, res) => {
  const { class_id, subject_id, term, session } = req.body;
  try {
    let sql  = `UPDATE results SET status = 'draft' WHERE class_id = ? AND term = ? AND session = ? AND status = 'submitted'`;
    const args = [class_id, term, session];
    if (subject_id) { sql += ' AND subject_id = ?'; args.push(subject_id); }
    await db.execute(sql, args);
    res.json({ message: 'Results sent back to teacher for revision.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/results/summary ──────────────────────────
   Admin: per-class upload status summary
──────────────────────────────────────────────────────── */
router.get('/summary', authenticate, authorize('admin'), async (req, res) => {
  const { term = 3, session = '2024/2025' } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT c.name AS class_name,
              COUNT(DISTINCT r.subject_id)         AS subjects_uploaded,
              SUM(r.status = 'published')           AS subjects_published,
              SUM(r.status = 'submitted')           AS subjects_pending,
              MAX(r.updated_at)                     AS last_updated
       FROM classes c
       LEFT JOIN results r ON r.class_id = c.id AND r.term = ? AND r.session = ?
       GROUP BY c.id, c.name
       ORDER BY c.level, c.name`,
      [term, session]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
