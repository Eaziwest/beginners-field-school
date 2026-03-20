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
  document.querySelectorAll('#admin-dashboard .sidebar-link').forEach(l => l.classList.remove('active'));
  const pane = document.getElementById('ap-' + name);
  if (pane) pane.classList.add('active');
  if (el && el.classList) el.classList.add('active');
}

/* ===== TEACHER TABS ===== */
function teacherTab(name, el) {
  document.querySelectorAll('#teacher-dashboard .stab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#teacher-dashboard .sidebar-link').forEach(l => l.classList.remove('active'));
  const pane = document.getElementById('tp-' + name);
  if (pane) pane.classList.add('active');
  if (el && el.classList) el.classList.add('active');
}

/* ===== STUDENT TABS ===== */
function studentTab(name, el) {
  document.querySelectorAll('#student-dashboard .stab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#student-dashboard .sidebar-link').forEach(l => l.classList.remove('active'));
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

/* ===== ADMISSION FORM SUBMIT ===== */
function submitAdmission() {
  const success = document.getElementById('adm-success');
  if (success) success.style.display = 'block';
  toast('Application BFS-2025-0039 submitted successfully!');
  setTimeout(() => closeModal('admission-modal'), 4500);
}

/* ===== PAYMENT METHOD SELECTION ===== */
function selectPayMethod(el) {
  document.querySelectorAll('.pay-opt').forEach(p => p.classList.remove('sel'));
  el.classList.add('sel');
}

/* ===== SHOP CART ===== */
let cart = [];

function addToCart(item) {
  cart.push(item);
  const cnt  = document.getElementById('cart-cnt');
  const body = document.getElementById('cart-body');
  const box  = document.getElementById('cart-box');
  if (cnt)  cnt.textContent = cart.length;
  if (body) body.innerHTML  = cart.map((i, n) =>
    `<div class="cart-item">${n + 1}. ${i}</div>`
  ).join('');
  if (box)  box.style.display = 'block';
  toast(item + ' added to cart!');
}

function clearCart() {
  cart = [];
  const box = document.getElementById('cart-box');
  if (box) box.style.display = 'none';
}

function placeOrder() {
  toast('Order placed! Items ready for pickup at school reception in 3 working days.');
  clearCart();
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
