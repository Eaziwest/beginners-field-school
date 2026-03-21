const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/announcements ────────────────────────────
   All authenticated users can read announcements.
   Filtered by audience for non-admin roles.
──────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    let sql = `
      SELECT a.id, a.title, a.body, a.audience, a.priority, a.created_at,
             u.name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE 1=1`;
    const args = [];

    // Students and teachers only see announcements relevant to them
    if (req.user.role === 'student') {
      sql += ` AND (a.audience LIKE '%Everyone%'
                OR a.audience LIKE '%All Students%'
                OR a.audience LIKE '%Student%')`;
    } else if (req.user.role === 'teacher') {
      sql += ` AND (a.audience LIKE '%Everyone%'
                OR a.audience LIKE '%All Teachers%'
                OR a.audience LIKE '%Teacher%')`;
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    args.push(parseInt(limit));

    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/announcements ───────────────────────────
   Admin only: create an announcement
   Body: { title, body, audience, priority? }
──────────────────────────────────────────────────────── */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { title, body, audience, priority = 'normal' } = req.body;

  if (!title || !body || !audience) {
    return res.status(400).json({ error: 'title, body, and audience are required.' });
  }
  if (!['normal', 'important', 'urgent'].includes(priority)) {
    return res.status(400).json({ error: 'priority must be normal, important, or urgent.' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO announcements (title, body, audience, priority, created_by) VALUES (?,?,?,?,?)',
      [title, body, audience, priority, req.user.id]
    );
    res.status(201).json({ message: 'Announcement sent.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── DELETE /api/announcements/:id ─────────────────────
   Admin only: delete an announcement
──────────────────────────────────────────────────────── */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.execute('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
