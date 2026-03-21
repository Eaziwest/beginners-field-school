const express = require('express');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/messages ─────────────────────────────────
   Returns inbox for the logged-in user
   Query: ?unread=true
──────────────────────────────────────────────────────── */
router.get('/', authenticate, async (req, res) => {
  try {
    const { unread } = req.query;
    let sql = `
      SELECT m.id, m.subject, m.body, m.is_read, m.created_at,
             u.name AS from_name, u.role AS from_role
      FROM messages m
      JOIN users u ON u.id = m.from_user
      WHERE m.to_user = ?`;
    const args = [req.user.id];

    if (unread === 'true') { sql += ' AND m.is_read = 0'; }
    sql += ' ORDER BY m.created_at DESC LIMIT 50';

    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/messages/sent ────────────────────────────
   Returns sent messages for the logged-in user
──────────────────────────────────────────────────────── */
router.get('/sent', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT m.id, m.subject, m.body, m.is_read, m.created_at,
              u.name AS to_name, u.role AS to_role
       FROM messages m
       JOIN users u ON u.id = m.to_user
       WHERE m.from_user = ?
       ORDER BY m.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/messages/unread-count ────────────────────
   Unread count badge for the header
──────────────────────────────────────────────────────── */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS count FROM messages WHERE to_user = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/messages ────────────────────────────────
   Send a message to another user
   Body: { to_user_id, subject, body }
──────────────────────────────────────────────────────── */
router.post('/', authenticate, async (req, res) => {
  const { to_user_id, subject, body } = req.body;

  if (!to_user_id || !subject || !body) {
    return res.status(400).json({ error: 'to_user_id, subject, and body are required.' });
  }
  if (to_user_id === req.user.id) {
    return res.status(400).json({ error: 'You cannot send a message to yourself.' });
  }

  try {
    const [target] = await db.execute('SELECT id FROM users WHERE id = ?', [to_user_id]);
    if (!target[0]) return res.status(404).json({ error: 'Recipient not found.' });

    const [result] = await db.execute(
      'INSERT INTO messages (from_user, to_user, subject, body) VALUES (?,?,?,?)',
      [req.user.id, to_user_id, subject, body]
    );
    res.status(201).json({ message: 'Message sent.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/messages/:id/read ──────────────────────
   Mark a message as read
──────────────────────────────────────────────────────── */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.execute(
      'UPDATE messages SET is_read = 1 WHERE id = ? AND to_user = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── DELETE /api/messages/:id ──────────────────────────
   Delete a received message
──────────────────────────────────────────────────────── */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM messages WHERE id = ? AND to_user = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Message deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
