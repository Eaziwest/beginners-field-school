/* ============================================================
   Beginner's Field Nursery & Primary School
   api.js  —  Frontend API client
   ============================================================
   All communication with the backend goes through this file.
   Include AFTER auth.js and main.js on every portal page:
     <script src="../js/api.js"></script>
   ============================================================ */

const API = (() => {

  /* ── Base URL — change to your production URL when deploying ── */
  const BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';   // same-origin when served by the Node server in production

  /* ── Token helpers ──────────────────────────────────────────── */
  function getToken()       { return sessionStorage.getItem('bfs_token'); }
  function saveToken(token) { sessionStorage.setItem('bfs_token', token); }
  function clearToken()     { sessionStorage.removeItem('bfs_token'); }

  /* ── Core fetch wrapper ─────────────────────────────────────── */
  async function request(method, path, body = null, isFormData = false) {
    const headers = {};
    const token   = getToken();

    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (body && !isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (networkErr) {
      throw new Error('Cannot reach the server. Please check your connection.');
    }

    /* Token expired — clear session and send to login */
    if (res.status === 401) {
      clearToken();
      clearSession();
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Request failed (' + res.status + ')');
    }

    return data;
  }

  /* ── Convenience methods ─────────────────────────────────────── */
  const get    = (path)         => request('GET',    path);
  const post   = (path, body)   => request('POST',   path, body);
  const put    = (path, body)   => request('PUT',    path, body);
  const patch  = (path, body)   => request('PATCH',  path, body);
  const del    = (path)         => request('DELETE', path);
  const upload = (path, form)   => request('POST',   path, form, true);

  /* ── Query-string helper ─────────────────────────────────────── */
  function qs(params) {
    const filtered = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    );
    const str = new URLSearchParams(filtered).toString();
    return str ? '?' + str : '';
  }

  /* ============================================================
     AUTH
  ============================================================ */
  const auth = {
    async login(email, password) {
      const data = await post('/auth/login', { email, password });
      saveToken(data.token);
      saveSession(data.user);           // keeps existing auth.js session helpers working
      return data.user;
    },
    me:             ()              => get('/auth/me'),
    changePassword: (cur, next)     => post('/auth/change-password', { currentPassword: cur, newPassword: next }),
    logout() {
      clearToken();
      clearSession();
      window.location.href = 'login.html';
    },
  };

  /* ============================================================
     DASHBOARD
  ============================================================ */
  const dashboard = {
    admin:   ()      => get('/dashboard/admin'),
    teacher: ()      => get('/dashboard/teacher'),
    student: (q={})  => get('/dashboard/student'  + qs(q)),
  };

  /* ============================================================
     ADMISSIONS
  ============================================================ */
  const admissions = {
    list:       (q={})           => get('/admissions'              + qs(q)),
    get:        (id)             => get('/admissions/' + id),
    submit:     (body)           => post('/admissions', body),
    setStatus:  (id, status, note) => patch('/admissions/' + id + '/status', { status, admin_note: note }),
  };

  /* ============================================================
     STUDENTS
  ============================================================ */
  const students = {
    list:   (q={})   => get('/students'     + qs(q)),
    me:     ()       => get('/students/me'),
    get:    (id)     => get('/students/'    + id),
    add:    (body)   => post('/students',   body),
    update: (id, b)  => patch('/students/' + id, b),
  };

  /* ============================================================
     TEACHERS
  ============================================================ */
  const teachers = {
    list:   (q={})   => get('/teachers'     + qs(q)),
    me:     ()       => get('/teachers/me'),
    get:    (id)     => get('/teachers/'    + id),
    add:    (body)   => post('/teachers',   body),
    update: (id, b)  => patch('/teachers/' + id, b),
  };

  /* ============================================================
     ATTENDANCE
  ============================================================ */
  const attendance = {
    list:    (q={})         => get('/attendance'                    + qs(q)),
    byStudent:(id, q={})    => get('/attendance/student/' + id      + qs(q)),
    save:    (body)         => post('/attendance', body),
  };

  /* ============================================================
     RESULTS
  ============================================================ */
  const results = {
    list:    (q={})   => get('/results'          + qs(q)),
    summary: (q={})   => get('/results/summary'  + qs(q)),
    upload:  (body)   => post('/results/bulk',   body),
    submit:  (body)   => patch('/results/submit', body),
    publish: (body)   => patch('/results/publish', body),
    reject:  (body)   => patch('/results/reject',  body),
  };

  /* ============================================================
     TIMETABLES
  ============================================================ */
  const timetables = {
    list:    (q={})          => get('/timetables'               + qs(q)),
    status:  (q={})          => get('/timetables/status'        + qs(q)),
    save:    (body)          => put('/timetables',               body),
    submit:  (body)          => patch('/timetables/submit',      body),
    review:  (id, st, note)  => patch('/timetables/' + id + '/review', { status: st, admin_note: note }),
  };

  /* ============================================================
     FEES
  ============================================================ */
  const fees = {
    list:    (q={})   => get('/fees'         + qs(q)),
    student: (q={})   => get('/fees/student' + qs(q)),
    save:    (body)   => put('/fees',           body),
    delete:  (id)     => del('/fees/'         + id),
  };

  /* ============================================================
     ANNOUNCEMENTS
  ============================================================ */
  const announcements = {
    list:    (q={})   => get('/announcements'     + qs(q)),
    create:  (body)   => post('/announcements',   body),
    delete:  (id)     => del('/announcements/'  + id),
  };

  /* ============================================================
     MESSAGES
  ============================================================ */
  const messages = {
    inbox:        (q={})   => get('/messages'               + qs(q)),
    sent:         ()       => get('/messages/sent'),
    unreadCount:  ()       => get('/messages/unread-count'),
    send:         (body)   => post('/messages',  body),
    markRead:     (id)     => patch('/messages/' + id + '/read', {}),
    delete:       (id)     => del('/messages/'  + id),
  };

  /* ============================================================
     FILE UPLOADS
  ============================================================ */
  const uploads = {
    /** file: a File object from an <input type="file"> */
    upload(file, entityType, entityId) {
      const form = new FormData();
      form.append('file', file);
      if (entityType) form.append('entity_type', entityType);
      if (entityId)   form.append('entity_id',   entityId);
      return upload('/uploads', form);
    },
    get: (id) => get('/uploads/' + id),
  };

  /* ── Public surface ────────────────────────────────────────── */
  return {
    auth, dashboard, admissions, students, teachers,
    attendance, results, timetables, fees,
    announcements, messages, uploads,
    /* low-level helpers exposed for one-off calls */
    get, post, put, patch, del,
  };

})();

/* ============================================================
   Override the auth.js attemptLogin so the login page calls
   the API instead of checking the hardcoded USERS array.
   This function is called by login.html's attemptLoginForm().
============================================================ */
async function attemptLogin(email, password) {
  try {
    return await API.auth.login(email, password);
  } catch (err) {
    return null;   // login.html checks for null to show the error message
  }
}
