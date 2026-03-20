/* ============================================================
   Beginner's Field Nursery & Primary School — Auth System
   ============================================================
   NOTE: These credentials are stored here for demo/prototype
   purposes only. In a real production system, authentication
   must be handled server-side with hashed passwords and
   secure sessions (e.g. Node.js + bcrypt + JWT or similar).
   ============================================================ */

const USERS = [
  {
    role:     'admin',
    name:     'Mrs. Adaeze Okafor',
    title:    'Principal',
    initials: 'AO',
    email:    'admin@beginnersfieldschool.edu.ng',
    password: 'Admin@2025',
    portal:   'admin.html'
  },
  {
    role:     'teacher',
    name:     'Mr. Emeka Chukwu',
    title:    'Class Teacher — P6A',
    initials: 'EC',
    email:    'e.chukwu@beginnersfieldschool.edu.ng',
    password: 'Teacher@2025',
    portal:   'teacher.html'
  },
  {
    role:     'student',
    name:     'Adaeze Nwosu',
    title:    'Primary 4 · 2024/2025',
    initials: 'AN',
    email:    'student@beginnersfieldschool.edu.ng',
    password: 'Student@2025',
    portal:   'student.html'
  }
];

/* ── Session helpers (sessionStorage so it clears on tab close) ── */

function saveSession(user) {
  sessionStorage.setItem('bfs_user', JSON.stringify({
    role:     user.role,
    name:     user.name,
    title:    user.title,
    initials: user.initials,
    email:    user.email
  }));
}

function getSession() {
  const raw = sessionStorage.getItem('bfs_user');
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  sessionStorage.removeItem('bfs_user');
}

/* ── Login validation ── */

function attemptLogin(email, password) {
  const match = USERS.find(
    u => u.email.toLowerCase() === email.trim().toLowerCase()
      && u.password === password
  );
  return match || null;
}

/* ── Guard: call at top of each portal page ──
   Redirects to login if no valid session,
   or if the session role doesn't match the required role. ── */

function requireAuth(requiredRole) {
  const user = getSession();
  if (!user || user.role !== requiredRole) {
    clearSession();
    window.location.href = 'login.html';
  }
  return user;
}

/* ── Logout ── */

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

/* ── Inject logged-in user info into the dashboard header ──
   Looks for elements with data-user-name, data-user-title,
   data-user-initials, data-user-email and fills them in. ── */

function injectUserInfo(user) {
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.name;
  });
  document.querySelectorAll('[data-user-title]').forEach(el => {
    el.textContent = user.title;
  });
  document.querySelectorAll('[data-user-initials]').forEach(el => {
    el.textContent = user.initials;
  });
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = user.email;
  });
}
