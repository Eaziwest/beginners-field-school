const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/dashboard/admin ──────────────────────────
   All the numbers shown on the admin overview tab
──────────────────────────────────────────────────────── */
router.get('/admin', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[students]]    = await db.execute("SELECT COUNT(*) AS n FROM students WHERE is_active = 1");
    const [[teachers]]    = await db.execute("SELECT COUNT(*) AS n FROM teachers t JOIN users u ON u.id = t.user_id WHERE u.is_active = 1");
    const [[pendingAdm]]  = await db.execute("SELECT COUNT(*) AS n FROM admissions WHERE status = 'pending'");
    const [[pendingTT]]   = await db.execute("SELECT COUNT(*) AS n FROM timetables WHERE status = 'pending'");
    const [[pendingRes]]  = await db.execute("SELECT COUNT(*) AS n FROM results WHERE status = 'submitted'");

    // Attendance rate today
    const [[attToday]] = await db.execute(
      `SELECT
         ROUND(SUM(status='present') / COUNT(*) * 100, 1) AS rate
       FROM attendance WHERE date = CURDATE()`
    );

    // 5 most recent admissions
    const [recentAdm] = await db.execute(
      `SELECT id, application_no, child_name, class_applied, parent_name, parent_phone, status, submitted_at
       FROM admissions ORDER BY submitted_at DESC LIMIT 5`
    );

    res.json({
      stats: {
        total_students:    students.n,
        total_teachers:    teachers.n,
        pending_admissions: pendingAdm.n,
        pending_timetables: pendingTT.n,
        pending_results:    pendingRes.n,
        attendance_rate:    attToday.rate ?? 0,
      },
      recent_admissions: recentAdm,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/dashboard/teacher ────────────────────────
   Dashboard numbers for the logged-in teacher
──────────────────────────────────────────────────────── */
router.get('/teacher', authenticate, authorize('teacher'), async (req, res) => {
  try {
    // Get teacher's class
    const [[cls]] = await db.execute(
      'SELECT id, name FROM classes WHERE teacher_id = ? LIMIT 1',
      [req.user.id]
    );
    if (!cls) return res.json({ stats: {}, class: null });

    const [[total]]    = await db.execute("SELECT COUNT(*) AS n FROM students WHERE class_id = ? AND is_active = 1", [cls.id]);
    const [[present]]  = await db.execute("SELECT COUNT(*) AS n FROM attendance WHERE class_id = ? AND date = CURDATE() AND status = 'present'", [cls.id]);
    const [[uploaded]] = await db.execute("SELECT COUNT(DISTINCT subject_id) AS n FROM results WHERE class_id = ? AND status IN ('submitted','approved','published')", [cls.id]);

    // Timetable status
    const [ttRows] = await db.execute(
      "SELECT status FROM timetables WHERE class_id = ? ORDER BY updated_at DESC LIMIT 1",
      [cls.id]
    );

    res.json({
      class: cls.name,
      stats: {
        total_students: total.n,
        present_today:  present.n,
        subjects_uploaded: uploaded.n,
        timetable_status: ttRows[0]?.status || 'none',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/dashboard/student ────────────────────────
   Dashboard numbers for the logged-in student
──────────────────────────────────────────────────────── */
router.get('/student', authenticate, authorize('student'), async (req, res) => {
  const { term = 3, session = '2024/2025' } = req.query;
  try {
    const [[stu]] = await db.execute(
      'SELECT id, class_id FROM students WHERE user_id = ?',
      [req.user.id]
    );
    if (!stu) return res.json({ stats: {} });

    // Average score for the term
    const [[avg]] = await db.execute(
      `SELECT ROUND(AVG(total), 1) AS avg
       FROM results WHERE student_id = ? AND term = ? AND session = ? AND status = 'published'`,
      [stu.id, term, session]
    );

    // Attendance rate
    const [[att]] = await db.execute(
      `SELECT ROUND(SUM(status='present') / COUNT(*) * 100, 1) AS rate
       FROM attendance WHERE student_id = ?`,
      [stu.id]
    );

    // Class position (rank by average total)
    const [ranking] = await db.execute(
      `SELECT student_id, ROUND(AVG(total), 1) AS avg_total
       FROM results
       WHERE class_id = ? AND term = ? AND session = ? AND status = 'published'
       GROUP BY student_id
       ORDER BY avg_total DESC`,
      [stu.class_id, term, session]
    );
    const position = ranking.findIndex(r => r.student_id === stu.id) + 1;
    const classSize = ranking.length;

    res.json({
      stats: {
        average:         avg.avg || 0,
        attendance_rate: att.rate || 0,
        position:        position || null,
        class_size:      classSize,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
