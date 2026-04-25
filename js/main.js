/* ============================================================
   Beginner's Field Nursery & Primary School — Main JS
   ============================================================ */

/* ===== SCREEN NAVIGATION ===== */
function goHome() {
  showScreen('home');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) { target.classList.add('active'); window.scrollTo(0, 0); }
}

/* ===== PORTAL OPEN (pre-selects role in login modal) ===== */
function openPortal(role) {
  const sel = document.getElementById('login-role');
  if (sel) sel.value = role;
  showModal('login-modal');
}

/* ===== LOGIN HANDLER ===== */
function handleLogin() {
  const role = document.getElementById('login-role').value;
  closeModal('login-modal');
  if      (role === 'admin')   showScreen('admin-dashboard');
  else if (role === 'teacher') showScreen('teacher-dashboard');
  else                         showScreen('student-dashboard');
}

/* ===== MODALS ===== */
function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
});

/* ===== ADMIN TABS ===== */
function adminTab(name, el) {
  document.querySelectorAll('#admin-dashboard .stab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#admin-sidebar .sidebar-link').forEach(l => l.classList.remove('active'));
  const pane = document.getElementById('ap-' + name);
  if (pane) pane.classList.add('active');
  if (el && el.classList) el.classList.add('active');
}

/* ===== TEACHER TABS ===== */
function teacherTab(name, el) {
  document.querySelectorAll('#teacher-dashboard .stab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#teacher-sidebar .sidebar-link').forEach(l => l.classList.remove('active'));
  const pane = document.getElementById('tp-' + name);
  if (pane) pane.classList.add('active');
  if (el && el.classList) el.classList.add('active');
}

/* ===== STUDENT TABS ===== */
function studentTab(name, el) {
  document.querySelectorAll('#student-dashboard .stab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#student-sidebar .sidebar-link').forEach(l => l.classList.remove('active'));
  const pane = document.getElementById('sp-' + name);
  if (pane) pane.classList.add('active');
  if (el && el.classList) el.classList.add('active');
}

/* ===== RESULT SUB-TABS ===== */
function switchResultTab(el, id) {
  const card = el.closest('.card');
  card.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
  card.querySelectorAll('.stab-pane').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  const pane = card.querySelector('#' + id);
  if (pane) pane.classList.add('active');
}

/* ===== TOAST NOTIFICATION ===== */
function toast(msg) {
  const t = document.getElementById('toast');
  const txt = document.getElementById('toast-text');
  if (!t || !txt) return;
  txt.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 3500);
}

/* ===== ADMISSION FORM SUBMIT =====
   FIX #8 — old stub used a hardcoded fake ID "BFS-2025-0039" and tried to
   close a modal that doesn't exist in admission.html. The real async
   submitAdmission() is defined inline in admission.html. This no-op guard
   prevents accidental double-declaration errors in other pages. */
if (typeof submitAdmission === 'undefined') {
  function submitAdmission() {
    console.warn('[main.js] submitAdmission() called before admission.html inline script loaded.');
  }
}

/* ===== ACTIVE SIDEBAR LINK (click highlight) ===== */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function () {
      const sidebar = this.closest('.sidebar');
      if (sidebar) sidebar.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
});

/* ===== SUBJECT SELECTION LOGIC =====
   FIX #6 — toggleNewSubjectInput() was defined TWICE (lines ~120 and ~217).
   The second definition silently overwrote the first. Only one copy is kept. */
function toggleNewSubjectInput(selectElem) {
  const customInput = document.getElementById('new-tch-subject-custom');
  if (!customInput) return;
  if (selectElem.value === 'ADD_NEW') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = '';
  }
}

/* ===== TEACHER SUBJECTS (chip list) ===== */
let selectedTeacherSubjects = [];

function addTeacherSubject() {
  const selectElement = document.getElementById('new-tch-subject');
  const customInput   = document.getElementById('new-tch-subject-custom');
  let newSubject = selectElement ? selectElement.value : '';

  if (newSubject === 'ADD_NEW') {
    newSubject = customInput ? customInput.value.trim() : '';
  }

  if (!newSubject) { toast('Please select or enter a subject name.'); return; }
  if (selectedTeacherSubjects.includes(newSubject)) { toast('This subject has already been added.'); return; }

  selectedTeacherSubjects.push(newSubject);
  renderTeacherSubjects();

  if (selectElement) selectElement.value = '';
  if (customInput)   { customInput.value = ''; customInput.style.display = 'none'; }
}

function removeTeacherSubject(subjectToRemove) {
  selectedTeacherSubjects = selectedTeacherSubjects.filter(s => s !== subjectToRemove);
  renderTeacherSubjects();
}

function renderTeacherSubjects() {
  const container   = document.getElementById('tch-subjects-container');
  const hiddenInput = document.getElementById('tch-selected-subjects-list');
  if (!container) return;

  container.innerHTML = '';
  selectedTeacherSubjects.forEach(subject => {
    const tag = document.createElement('span');
    tag.style.cssText = `
      background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe;
      padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;
      display:inline-flex;align-items:center;gap:8px;`;
    tag.innerHTML = `${subject}
      <button type="button" onclick="removeTeacherSubject('${subject.replace(/'/g,"\\'")}') "
        style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px;font-weight:bold;padding:0;">&times;</button>`;
    container.appendChild(tag);
  });

  if (hiddenInput) hiddenInput.value = JSON.stringify(selectedTeacherSubjects);
}

/* ===== SAVE NEW TEACHER (main.js version) =====
   FIX #7 — this function used `typeof supabase !== 'undefined'` and `supabase.from()`
   which is the wrong global — the project uses `window._supabase` everywhere.
   The definitive saveNewTeacher() lives in admin.html (uses DB layer + admin client).
   This stub is kept only so pages that load main.js but NOT admin.html don't crash. */
if (typeof saveNewTeacher === 'undefined') {
  async function saveNewTeacher() {
    console.warn('[main.js] saveNewTeacher() stub — real implementation is in admin.html inline script.');
  }
}
