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
// Each entry: { label: string, price: number, qty: number }
let cart = [];

/* Render cart box */
function renderCart() {
  const cnt   = document.getElementById('cart-cnt');
  const body  = document.getElementById('cart-body');
  const total = document.getElementById('cart-total');
  const box   = document.getElementById('cart-box');
  if (!box) return;

  if (cart.length === 0) {
    box.style.display = 'none';
    return;
  }

  box.style.display = 'block';

  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (cnt)  cnt.textContent = totalItems;
  if (body) body.innerHTML  = cart.map((item, n) =>
    `<div class="cart-item" style="display:flex;justify-content:space-between;align-items:center;">
       <span>${n + 1}. ${item.label}${item.qty > 1 ? ' <strong>×' + item.qty + '</strong>' : ''}</span>
       <span style="font-weight:700;color:var(--navy-mid);">₦${(item.price * item.qty).toLocaleString()}</span>
     </div>`
  ).join('');
  if (total) total.textContent = 'Total: ₦' + totalPrice.toLocaleString();
}

/* Generic add — label only, no price tracking (for items without explicit price) */
function addToCart(label) {
  // Parse price from label if it contains "— ₦X,XXX"
  const match = label.match(/₦([\d,]+)/);
  const price = match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
  const cleanLabel = label.replace(/ — ₦[\d,]+/, '');

  const existing = cart.find(i => i.label === cleanLabel);
  if (existing) { existing.qty += 1; }
  else          { cart.push({ label: cleanLabel, price, qty: 1 }); }

  renderCart();
  toast(cleanLabel + ' added to cart!');
}

/* Add uniform with size check */
function addUniform() {
  const sel = document.getElementById('uniform-size');
  if (!sel || !sel.value) {
    toast('⚠️ Please select a size first.');
    return;
  }
  const label = 'School Uniform (' + sel.value + ')';
  const existing = cart.find(i => i.label === label);
  if (existing) { existing.qty += 1; }
  else          { cart.push({ label, price: 3500, qty: 1 }); }
  renderCart();
  toast(label + ' added to cart!');
}

/* Add exercise book using qty spinner */
function addBook(btn, bookName, unitPrice) {
  const row = btn.closest('.book-row');
  const qtyEl = row ? row.querySelector('.qty-val') : null;
  const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
  const finalQty = qty < 1 ? 1 : qty;

  const existing = cart.find(i => i.label === bookName);
  if (existing) { existing.qty += finalQty; }
  else          { cart.push({ label: bookName, price: unitPrice, qty: finalQty }); }

  // Reset spinner
  if (qtyEl) qtyEl.textContent = '0';
  renderCart();
  toast(finalQty + '× ' + bookName + ' added to cart!');
}

/* Qty spinner +/- */
function changeQty(btn, delta) {
  const row   = btn.closest('.book-row');
  const qtyEl = row ? row.querySelector('.qty-val') : null;
  if (!qtyEl) return;
  const current = parseInt(qtyEl.textContent, 10) || 0;
  const next    = Math.max(0, current + delta);
  qtyEl.textContent = next;
}

function clearCart() {
  cart = [];
  renderCart();
}

function placeOrder() {
  if (cart.length === 0) { toast('⚠️ Your cart is empty.'); return; }
  const totalPrice = cart.reduce((s, i) => s + i.price * i.qty, 0);
  toast('✅ Order placed! Total: ₦' + totalPrice.toLocaleString() + '. Ready for pickup in 3 working days.');
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
