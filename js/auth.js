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
    id:                 user.id   || '',   /* FIX #14 — id was missing; student portal needs it */
    role:               user.role,
    name:               user.name,
    title:              user.title,
    initials:           user.initials,
    email:              user.email,
    class_assigned:     user.class_assigned || '',
    student_id:         user.student_id    || '', /* populated from profiles for student role */
    must_reset_password:!!user.must_reset_password
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

/* ── First-login password reset ─────────────────────────────
   Call this on any portal page that can be reached by a parent.
   It checks must_reset_password and injects a blocking modal
   that forces a password change before the user can proceed.
   ─────────────────────────────────────────────────────────── */
function checkMustResetPassword(user) {
  if (!user || !user.must_reset_password) return;

  /* Inject modal if not already present */
  if (document.getElementById('bfs-pw-reset-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'bfs-pw-reset-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(10,31,68,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;`;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:36px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:42px;margin-bottom:10px;">🔐</div>
        <h2 style="font-family:'Merriweather',serif;color:#0a1f44;margin:0 0 8px;">Set Your Password</h2>
        <p style="color:#6b7280;font-size:13.5px;margin:0;">
          Welcome! For your security, please set a new password before continuing.
          Your temporary password will no longer work after this.
        </p>
      </div>
      <div id="bfs-pw-reset-error" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:12px;font-size:13px;color:#dc2626;margin-bottom:16px;"></div>
      <div style="margin-bottom:14px;">
        <label style="font-size:13px;font-weight:700;color:#0a1f44;display:block;margin-bottom:6px;">New Password *</label>
        <input id="bfs-pw-new" type="password" placeholder="At least 8 characters"
          style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;" />
      </div>
      <div style="margin-bottom:20px;">
        <label style="font-size:13px;font-weight:700;color:#0a1f44;display:block;margin-bottom:6px;">Confirm Password *</label>
        <input id="bfs-pw-confirm" type="password" placeholder="Repeat your new password"
          style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;" />
      </div>
      <button id="bfs-pw-submit-btn" onclick="submitPasswordReset()"
        style="width:100%;padding:14px;background:#0a1f44;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">
        🔒 Set Password &amp; Continue
      </button>
    </div>`;

  document.body.appendChild(overlay);
}

async function submitPasswordReset() {
  const newPw  = (document.getElementById('bfs-pw-new')?.value     || '').trim();
  const confPw = (document.getElementById('bfs-pw-confirm')?.value || '').trim();
  const errEl  = document.getElementById('bfs-pw-reset-error');
  const btn    = document.getElementById('bfs-pw-submit-btn');

  const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };
  const hideErr = ()    => { if (errEl) errEl.style.display = 'none'; };

  hideErr();
  if (!newPw || newPw.length < 8) { showErr('Password must be at least 8 characters.'); return; }
  if (newPw !== confPw)           { showErr('Passwords do not match. Please try again.'); return; }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Updating…'; }

  try {
    const { error } = await window._supabase.auth.updateUser({ password: newPw });
    if (error) throw error;

    /* Clear the flag in profiles table */
    const { data: { user } } = await window._supabase.auth.getUser();
    if (user) {
      await window._supabase.from('profiles')
        .update({ must_reset_password: false })
        .eq('id', user.id);
    }

    /* Update session */
    const session = getSession();
    if (session) { session.must_reset_password = false; saveSession(session); }

    /* Remove modal */
    const overlay = document.getElementById('bfs-pw-reset-overlay');
    if (overlay) overlay.remove();

  } catch(err) {
    showErr(err.message || 'Password update failed. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = '🔒 Set Password & Continue'; }
  }
}
