/* ============================================================
   Beginner's Field School — Auth System (Supabase-powered)
   ============================================================
   Uses Supabase Auth for email/password login.
   On success the user's profile row is fetched from the
   `profiles` table and stored in sessionStorage for fast
   access on subsequent pages.
   ============================================================ */

/* ── Session helpers (sessionStorage clears on tab close) ── */

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

/* ── Login (async — uses Supabase Auth) ──────────────────────
   Returns profile object on success, throws on failure.
   ─────────────────────────────────────────────────────────── */
async function attemptLoginAsync(email, password) {
  if (!window._supabase) {
    throw new Error('Supabase is not configured. Please update js/supabase-config.js.');
  }

  const { data: authData, error: authError } = await window._supabase.auth
    .signInWithPassword({ email: email.trim().toLowerCase(), password });

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      throw new Error('Incorrect email or password. Please try again.');
    }
    throw new Error(authError.message);
  }

  const { data: profile, error: profileError } = await window._supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    await window._supabase.auth.signOut();
    throw new Error('Account found but no school profile exists. Please contact the admin.');
  }

  return profile;
}

/* ── Guard: call at top of each portal page ── */
function requireAuth(requiredRole) {
  const user = getSession();
  if (!user || user.role !== requiredRole) {
    clearSession();
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

/* ── Logout ── */
async function logout() {
  clearSession();
  if (window._supabase) {
    await window._supabase.auth.signOut().catch(() => {});
  }
  window.location.href = 'login.html';
}

/* ── Inject logged-in user info into the dashboard header ── */
function injectUserInfo(user) {
  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = user.name;
  });
  document.querySelectorAll('[data-user-title]').forEach(el => {
    el.textContent = user.title || '';
  });
  document.querySelectorAll('[data-user-initials]').forEach(el => {
    el.textContent = user.initials || user.name.slice(0, 2).toUpperCase();
  });
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = user.email;
  });
}
