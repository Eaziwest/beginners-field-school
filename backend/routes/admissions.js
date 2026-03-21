const express = require('express');
const db      = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/* ─── GET /api/admissions ───────────────────────────────
   Admin: all applications  |  Query: ?status=pending&class=Primary 1
──────────────────────────────────────────────────────── */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, class: cls, search } = req.query;
    let sql    = 'SELECT * FROM admissions WHERE 1=1';
    const args = [];

    if (status) { sql += ' AND status = ?';          args.push(status); }
    if (cls)    { sql += ' AND class_applied = ?';   args.push(cls); }
    if (search) { sql += ' AND child_name LIKE ?';   args.push('%' + search + '%'); }

    sql += ' ORDER BY submitted_at DESC';

    const [rows] = await db.execute(sql, args);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── GET /api/admissions/:id ───────────────────────────
   Single application detail
──────────────────────────────────────────────────────── */
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM admissions WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Application not found.' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── POST /api/admissions ──────────────────────────────
   Public — submit a new application
──────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  const {
    child_name, dob, gender, class_applied,
    parent_name, parent_phone, parent_email,
    address, prev_school,
  } = req.body;

  if (!child_name || !class_applied || !parent_name || !parent_phone) {
    return res.status(400).json({ error: 'Child name, class, parent name and phone are required.' });
  }

  try {
    // Generate application number: BFS-YYYY-XXXX
    const [countRows] = await db.execute('SELECT COUNT(*) AS cnt FROM admissions');
    const appNo = 'BFS-' + new Date().getFullYear() + '-' + String(countRows[0].cnt + 1).padStart(4, '0');

    const [result] = await db.execute(
      `INSERT INTO admissions
         (application_no, child_name, dob, gender, class_applied,
          parent_name, parent_phone, parent_email, address, prev_school)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [appNo, child_name, dob || null, gender || null, class_applied,
       parent_name, parent_phone, parent_email || null, address || null, prev_school || null]
    );

    res.status(201).json({ message: 'Application submitted.', application_no: appNo, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── PATCH /api/admissions/:id/status ─────────────────
   Admin: approve or reject an application
   Body: { status: 'approved'|'rejected', admin_note? }
──────────────────────────────────────────────────────── */
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  const { status, admin_note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM admissions WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Application not found.' });

    await db.execute(
      `UPDATE admissions
         SET status = ?, admin_note = ?, reviewed_at = NOW(), reviewed_by = ?
       WHERE id = ?`,
      [status, admin_note || null, req.user.id, req.params.id]
    );

    res.json({ message: `Application ${status}.` });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
