const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Storage config ──────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WebP and PDF files are allowed.'));
  },
});

/* ─── POST /api/uploads ─────────────────────────────────
   Upload a single file.
   Form-data fields: file (required), entity_type, entity_id
──────────────────────────────────────────────────────── */
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received.' });

  const { entity_type, entity_id } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO uploads (filename, original, mime_type, size_bytes, entity_type, entity_id, uploaded_by)
       VALUES (?,?,?,?,?,?,?)`,
      [req.file.filename, req.file.originalname, req.file.mimetype,
       req.file.size, entity_type || null, entity_id || null, req.user.id]
    );

    res.status(201).json({
      id:       result.insertId,
      filename: req.file.filename,
      original: req.file.originalname,
      url:      '/uploads/' + req.file.filename,
      size:     req.file.size,
    });
  } catch (err) {
    // Clean up the saved file if the DB insert failed
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ─── Multer error handler ───────────────────────────── */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`
      : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

/* ─── GET /api/uploads/:id ──────────────────────────────
   Get metadata for a single upload
──────────────────────────────────────────────────────── */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM uploads WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'File not found.' });
    res.json({ ...rows[0], url: '/uploads/' + rows[0].filename });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
