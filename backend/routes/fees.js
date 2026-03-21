const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/fees ─────────────────────────────────────
   Public (any authenticated user): current fee schedule
   Query: ?term=3&session=2024/2025&level=primary
──────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  const { term = 3, session = '2024/2025', level } = req.query;
  try {
    let sql  = 'SELECT * FROM fee_schedule WHERE term = ? AND session = ?';
    const args = [term, session];
    if (level) { sql += ' AND level = ?'; args.push(level); }
    sql += ' ORDER BY level, is_optional, item_name';

    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/fees/student ─────────────────────────────
   Student: fees applicable to their own class level
──────────────────────────────────────────────────────── */
router.get('/student', authenticate, authorize('student'), async (req, res) => {
  const { term = 3, session = '2024/2025' } = req.query;
  try {
    // Determine the student's class level
    const [stuRows] = await db.execute(
      `SELECT c.level FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    const level = stuRows[0]?.level || 'primary';

    const [rows] = await db.execute(
      `SELECT item_name, amount, is_optional
       FROM fee_schedule
       WHERE term = ? AND session = ? AND level = ?
       ORDER BY is_optional, item_name`,
      [term, session, level]
    );
    res.json({ level, fees: rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PUT /api/fees ─────────────────────────────────────
   Admin: upsert the fee schedule for a term/session/level
   Body: { term, session, level, items: [{item_name, amount, is_optional}] }
──────────────────────────────────────────────────────── */
router.put('/', authenticate, authorize('admin'), async (req, res) => {
  const { term, session, level, items } = req.body;

  if (!term || !session || !level || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'term, session, level, and items[] are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const item of items) {
      if (!item.item_name || item.amount === undefined) continue;
      await conn.execute(
        `INSERT INTO fee_schedule (term, session, level, item_name, amount, is_optional, updated_by)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           amount = VALUES(amount),
           is_optional = VALUES(is_optional),
           updated_by  = VALUES(updated_by),
           updated_at  = NOW()`,
        [term, session, level, item.item_name, item.amount, item.is_optional ? 1 : 0, req.user.id]
      );
    }

    await conn.commit();
    res.json({ message: 'Fee schedule saved.', count: items.length });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    conn.release();
  }
});

/* ─── DELETE /api/fees/:id ──────────────────────────────
   Admin: remove a fee line item
──────────────────────────────────────────────────────── */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.execute('DELETE FROM fee_schedule WHERE id = ?', [req.params.id]);
    res.json({ message: 'Fee item removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
