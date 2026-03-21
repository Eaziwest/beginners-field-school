/* ============================================================
   Beginner's Field Nursery & Primary School — API Server
   ============================================================
   Start:  node server.js
   Dev:    npm run dev   (requires nodemon)
   ============================================================ */

require('dotenv').config();

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const path        = require('path');
const rateLimit   = require('express-rate-limit');

const app = express();

// ─── Security middleware ────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow uploaded files to load
}));

// ─── CORS ───────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile apps, Postman, same-origin file://)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed — ' + origin));
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Body parsers ───────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Rate limiting ──────────────────────────────────────
// Tighter limit on the login endpoint to slow brute-force attempts
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      20,
  message:  { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// General API rate limit
app.use('/api', rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max:      200,
  message:  { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ─── Static file serving ────────────────────────────────
// Serve uploaded files (receipts, photos, etc.)
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// Serve the frontend from the project root (one level up from backend/)
// Remove this if you use a separate server (e.g. Nginx) for the frontend
const frontendDir = path.join(__dirname, '..');
app.use(express.static(frontendDir, { index: 'index.html' }));

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/admissions',    require('./routes/admissions'));
app.use('/api/students',      require('./routes/students'));
app.use('/api/teachers',      require('./routes/teachers'));
app.use('/api/attendance',    require('./routes/attendance'));
app.use('/api/results',       require('./routes/results'));
app.use('/api/timetables',    require('./routes/timetables'));
app.use('/api/fees',          require('./routes/fees'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/uploads',       require('./routes/uploads'));
app.use('/api/dashboard',     require('./routes/dashboard'));

// ─── Health check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    service: "Beginner's Field School API",
    env:     process.env.NODE_ENV || 'development',
    time:    new Date().toISOString(),
  });
});

// ─── 404 for unknown API routes ─────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ─── Frontend fallback (SPA-style) ──────────────────────
// Send the HTML file for any non-API request so page refreshes work
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ─── Global error handler ───────────────────────────────
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

// ─── Start ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`\n🌱 Beginner's Field School API`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Listening   : http://localhost:${PORT}`);
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
});
