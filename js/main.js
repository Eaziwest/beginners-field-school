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

/* ===== ADMISSION FORM SUBMIT ===== */
function submitAdmission() {
  const success = document.getElementById('adm-success');
  if (success) success.style.display = 'block';
  toast('Application BFS-2025-0039 submitted successfully!');
  setTimeout(() => closeModal('admission-modal'), 4500);
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

/* ===== SUBJECT SELECTION LOGIC ===== */
function toggleNewSubjectInput(selectElem) {
  const customInput = document.getElementById('new-tch-subject-custom');
  if (selectElem.value === 'ADD_NEW') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = ''; 
  }
}

/* ===== SAVE NEW TEACHER LOGIC ===== */
async function saveNewTeacher() {
  const name = document.getElementById('new-tch-name').value;
  const phone = document.getElementById('new-tch-phone').value;
  const assignedClass = document.getElementById('new-tch-class').value;
  const email = document.getElementById('new-tch-email').value;
  
  const subjectSelect = document.getElementById('new-tch-subject').value;
  let finalSubject = subjectSelect;

  if (subjectSelect === 'ADD_NEW') {
    const customSubject = document.getElementById('new-tch-subject-custom').value;
    if (!customSubject.trim()) {
      toast('Please enter the name of the new subject.');
      return;
    }
    finalSubject = customSubject.trim();
    
    // Call Supabase here to save the custom subject dynamically
    if (typeof supabase !== 'undefined') {
      const { error: subjectErr } = await supabase
        .from('subjects')
        .insert([{ name: finalSubject }]);
        
      if (subjectErr) {
        console.error("Failed to register new subject:", subjectErr);
        toast('Failed to register the new subject.');
        return;
      }
    }
  }

  if (!name || !phone || !assignedClass || !finalSubject || !email) {
    toast('Please fill in all required fields.');
    return;
  }

  // Call Supabase here to save the teacher details
  if (typeof supabase !== 'undefined') {
    const { data, error } = await supabase
      .from('teachers')
      .insert([{ 
        name: name, 
        phone: phone, 
        class_assigned: assignedClass, 
        subject: finalSubject, 
        email: email 
      }]);

    if (error) {
      toast('Error saving teacher.');
      console.error(error);
    } else {
      toast('Teacher saved successfully!');
      
      // Close modal and reset form
      const modal = document.getElementById('modal-add-teacher');
      if (modal) modal.classList.remove('open');
      
      document.getElementById('new-tch-name').value = '';
      document.getElementById('new-tch-phone').value = '';
      document.getElementById('new-tch-class').value = '';
      document.getElementById('new-tch-email').value = '';
      document.getElementById('new-tch-subject').value = '';
      document.getElementById('new-tch-subject-custom').style.display = 'none';
      document.getElementById('new-tch-subject-custom').value = '';
      
      // If there's a function to reload the teachers list, call it here
      // filterTeachers();
    }
  } else {
    // Fallback logic if Supabase is not configured yet
    toast(`Teacher ${name} mapped to ${finalSubject} successfully!`);
    const modal = document.getElementById('modal-add-teacher');
    if (modal) modal.classList.remove('open');
  }
}

// ==========================================
// TEACHER SUBJECTS SELECTION LOGIC
// ==========================================

// Array to hold the list of subjects the admin adds
let selectedTeacherSubjects = [];

// Show/hide the custom subject input field
function toggleNewSubjectInput(selectElement) {
  const customInput = document.getElementById('new-tch-subject-custom');
  if (selectElement.value === 'ADD_NEW') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = ''; // clear it if they change their mind
  }
}

// Add a subject to the list
function addTeacherSubject() {
  const selectElement = document.getElementById('new-tch-subject');
  const customInput = document.getElementById('new-tch-subject-custom');
  
  let newSubject = selectElement.value;

  // If they selected "ADD_NEW", grab the text from the input field instead
  if (newSubject === 'ADD_NEW') {
    newSubject = customInput.value.trim();
  }

  // Validation: Check if empty or if it's already in the list
  if (!newSubject || newSubject === "") {
    toast("Please select or enter a subject name.");
    return;
  }
  if (selectedTeacherSubjects.includes(newSubject)) {
    toast("This subject has already been added.");
    return;
  }

  // Add to array and update UI
  selectedTeacherSubjects.push(newSubject);
  renderTeacherSubjects();

  // Reset the inputs for the next subject
  selectElement.value = "";
  customInput.value = "";
  customInput.style.display = 'none';
}

// Remove a subject from the list
function removeTeacherSubject(subjectToRemove) {
  // Filter out the subject that was clicked
  selectedTeacherSubjects = selectedTeacherSubjects.filter(sub => sub !== subjectToRemove);
  renderTeacherSubjects();
}

// Render the visual tags (chips) on the screen
function renderTeacherSubjects() {
  const container = document.getElementById('tch-subjects-container');
  const hiddenInput = document.getElementById('tch-selected-subjects-list');
  
  container.innerHTML = ''; // Clear current display

  selectedTeacherSubjects.forEach(subject => {
    // Create the tag element
    const tag = document.createElement('span');
    tag.style.cssText = `
      background: #eff6ff; 
      color: #3b82f6; 
      border: 1px solid #bfdbfe; 
      padding: 6px 12px; 
      border-radius: 8px; 
      font-size: 13px; 
      font-weight: 600;
      display: inline-flex; 
      align-items: center; 
      gap: 8px;
    `;
    
    tag.innerHTML = `
      ${subject} 
      <button type="button" onclick="removeTeacherSubject('${subject}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px; font-weight:bold; padding:0; display:flex; align-items:center; justify-content:center;">&times;</button>
    `;
    
    container.appendChild(tag);
  });

  // Store the array as a JSON string in the hidden input so your saveNewTeacher() function can easily grab it
  hiddenInput.value = JSON.stringify(selectedTeacherSubjects);
}