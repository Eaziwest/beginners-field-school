/* ============================================================
   Beginner's Field School — Database Layer (db.js)
   All Supabase operations in one place.
   Depends on: supabase-config.js (window._supabase)
   ============================================================ */

const DB = (function () {

  /* Internal helper — returns the Supabase client */
  function sb() {
    if (!window._supabase) throw new Error('[DB] Supabase client not initialised — check supabase-config.js');
    return window._supabase;
  }

  /* ── Utility: format a Postgres error for display ── */
  function fmtErr(e) {
    return (e && e.message) ? e.message : 'Database error — please try again.';
  }

  /* ══════════════════════════════════════════════════════
     STUDENTS
  ══════════════════════════════════════════════════════ */
  const students = {

    async getAll() {
      const { data, error } = await sb()
        .from('students')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async add({ firstName, lastName, className, gender, parentName, parentPhone, parentEmail }) {
      /* Generate sequential student ID */
      const { count } = await sb().from('students').select('*', { count: 'exact', head: true });
      const num   = String((count || 0) + 1).padStart(3, '0');
      const year  = new Date().getFullYear();
      const stuId = `BFS/${year}/${num}`;

      const { data, error } = await sb().from('students').insert([{
        student_id:   stuId,
        first_name:   firstName,
        last_name:    lastName,
        class:        className,
        gender,
        parent_name:  parentName,
        parent_phone: parentPhone,
        parent_email: parentEmail || null,
        fee_status:   'Pending',
        attendance:   '—',
        status:       'Active'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async update(id, fields) {
      const { data, error } = await sb()
        .from('students')
        .update(fields)
        .eq('id', id)
        .select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async getByClass(className) {
      const { data, error } = await sb()
        .from('students')
        .select('*')
        .eq('class', className)
        .order('last_name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     ADMISSIONS
  ══════════════════════════════════════════════════════ */
  const admissions = {

    async getAll() {
      const { data, error } = await sb()
        .from('admissions')
        .select('*')
        .order('applied_date', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async updateStatus(id, status) {
      const { data, error } = await sb()
        .from('admissions')
        .update({ status })
        .eq('id', id)
        .select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    /* Called from the public admission.html form */
    async submit({ studentName, classApplied, parentName, parentPhone, parentEmail,
                   dateOfBirth, gender, previousSchool, homeAddress, occupation, relationship }) {
      const { data, error } = await sb().from('admissions').insert([{
        student_name:    studentName,
        class_applied:   classApplied,
        parent_name:     parentName,
        parent_phone:    parentPhone,
        parent_email:    parentEmail  || null,
        date_of_birth:   dateOfBirth  || null,
        gender:          gender       || null,
        previous_school: previousSchool || null,
        home_address:    homeAddress  || null,
        occupation:      occupation   || null,
        relationship:    relationship || null,
        status:          'Pending'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    /* ─────────────────────────────────────────────────────
       APPROVE — full workflow:
         1. Generate serial number (BFS/YEAR/NNNN)
         2. Generate temporary password
         3. Create Supabase Auth account for parent
         4. Insert parent profile row
         5. Insert student record
         6. Update admission row (Approved + serial + temp_password)
       Returns { admission, student, serial, tempPassword }
    ───────────────────────────────────────────────────── */
    async approve(admissionId) {
      /* Fetch the admission record */
      const { data: adm, error: admErr } = await sb()
        .from('admissions').select('*').eq('id', admissionId).single();
      if (admErr) throw new Error(fmtErr(admErr));
      if (!adm.parent_email) throw new Error('Parent email is required to approve admission.');

      /* Generate serial number */
      const year    = new Date().getFullYear();
      const { count } = await sb()
        .from('admissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Approved');
      const serial  = `BFS/${year}/${String((count || 0) + 1).padStart(4, '0')}`;

      /* Generate a secure temporary password */
      const chars   = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
      const tempPass = Array.from({ length: 10 }, () =>
        chars[Math.floor(Math.random() * chars.length)]).join('');

      /* Create Supabase Auth account for parent */
      const { data: authData, error: authErr } = await sb().auth.admin
        ? await sb().auth.admin.createUser({
            email:    adm.parent_email,
            password: tempPass,
            email_confirm: true
          })
        : { data: null, error: { message: 'Admin API unavailable — use service role key' } };

      /* If admin API unavailable, fall back: store credentials; admin creates user manually */
      let parentUserId = null;
      if (authErr) {
        console.warn('[BFS Admissions] Auth admin API not available:', authErr.message);
        /* We still proceed — the serial and temp password are stored so admin can create the
           account manually via the Supabase dashboard and share credentials with the parent. */
      } else if (authData && authData.user) {
        parentUserId = authData.user.id;
        /* Insert parent profile */
        await sb().from('profiles').insert([{
          id:                  parentUserId,
          role:                'parent',
          name:                adm.parent_name  || 'Parent',
          email:               adm.parent_email,
          portal:              'student.html',
          must_reset_password: true
        }]);
      }

      /* Create student record */
      const { count: stuCount } = await sb()
        .from('students').select('*', { count: 'exact', head: true });
      const stuId = `BFS/${year}/${String((stuCount || 0) + 1).padStart(3, '0')}`;

      const nameParts = (adm.student_name || '').trim().split(' ');
      const { data: student, error: stuErr } = await sb().from('students').insert([{
        student_id:    stuId,
        first_name:    nameParts[0] || adm.student_name,
        last_name:     nameParts.slice(1).join(' ') || '',
        class:         adm.class_applied,
        gender:        adm.gender        || null,
        parent_name:   adm.parent_name   || null,
        parent_phone:  adm.parent_phone  || null,
        parent_email:  adm.parent_email  || null,
        fee_status:    'Pending',
        attendance:    '—',
        status:        'Active'
      }]).select().single();
      if (stuErr) throw new Error(fmtErr(stuErr));

      /* Update admission row */
      const { data: updated, error: upErr } = await sb()
        .from('admissions')
        .update({ status: 'Approved', serial_number: serial, temp_password: tempPass })
        .eq('id', admissionId).select().single();
      if (upErr) throw new Error(fmtErr(upErr));

      return { admission: updated, student, serial, tempPassword: tempPass };
    },

    /* ─────────────────────────────────────────────────────
       REJECT — marks admission Rejected + stores note
    ───────────────────────────────────────────────────── */
    async reject(admissionId, rejectionNote) {
      const { data, error } = await sb()
        .from('admissions')
        .update({ status: 'Rejected', rejection_note: rejectionNote || null })
        .eq('id', admissionId).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     TEACHERS
  ══════════════════════════════════════════════════════ */
  const teachers = {

    async getAll() {
      const { data, error } = await sb()
        .from('teachers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async add({ name, phone, classAssigned, subject, email }) {
      const { data, error } = await sb().from('teachers').insert([{
        name,
        phone,
        class_assigned:    classAssigned,
        subject,
        email,
        attendance:        '—',
        results_status:    'Pending',
        employment_status: 'Active'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async update(id, fields) {
      const { data, error } = await sb()
        .from('teachers')
        .update(fields)
        .eq('id', id)
        .select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     FEES CONFIG
  ══════════════════════════════════════════════════════ */
  const fees = {

    /* Returns an object: { nursery_tuition: 35000, ... } */
    async get() {
      const { data, error } = await sb().from('fees_config').select('fee_key, fee_value');
      if (error) throw new Error(fmtErr(error));
      return Object.fromEntries(data.map(r => [r.fee_key, r.fee_value]));
    },

    /* Accepts the same shape returned by get() */
    async save(feeMap) {
      const upserts = Object.entries(feeMap).map(([fee_key, fee_value]) => ({
        fee_key,
        fee_value: Number(fee_value) || 0,
        updated_at: new Date().toISOString()
      }));
      const { error } = await sb()
        .from('fees_config')
        .upsert(upserts, { onConflict: 'fee_key' });
      if (error) throw new Error(fmtErr(error));
    }
  };

  /* ══════════════════════════════════════════════════════
     RESULTS
  ══════════════════════════════════════════════════════ */
  const results = {

    async getAll() {
      const { data, error } = await sb()
        .from('results')
        .select('*')
        .order('class_name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async updateStatus(id, uploadStatus, adminNote) {
      const fields = { upload_status: uploadStatus };
      if (adminNote !== undefined) fields.admin_note = adminNote;
      const { data, error } = await sb()
        .from('results')
        .update(fields)
        .eq('id', id)
        .select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     ANNOUNCEMENTS
  ══════════════════════════════════════════════════════ */
  const announcements = {

    async getAll() {
      const { data, error } = await sb()
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async create({ title, body, audience, priority }) {
      const { data, error } = await sb().from('announcements').insert([{
        title, body, audience, priority
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     TIMETABLES
  ══════════════════════════════════════════════════════ */
  const timetables = {

    async get(classKey) {
      const { data, error } = await sb()
        .from('timetables')
        .select('*')
        .eq('class_key', classKey)
        .maybeSingle();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async getAll() {
      const { data, error } = await sb()
        .from('timetables')
        .select('*')
        .order('class_label', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async save(classKey, { rows, status, adminNote, classLabel, teacherName }) {
      const { data, error } = await sb()
        .from('timetables')
        .upsert({
          class_key:    classKey,
          class_label:  classLabel,
          teacher_name: teacherName,
          rows:         rows || [],
          status:       status || 'draft',
          admin_note:   adminNote || '',
          updated_at:   new Date().toISOString()
        }, { onConflict: 'class_key' })
        .select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async updateStatus(classKey, status, adminNote) {
      const { data, error } = await sb()
        .from('timetables')
        .update({ status, admin_note: adminNote || '', updated_at: new Date().toISOString() })
        .eq('class_key', classKey)
        .select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     DASHBOARD STATS (aggregated)
  ══════════════════════════════════════════════════════ */
  const stats = {

    async getOverview() {
      const [stuRes, tchRes, admRes] = await Promise.all([
        sb().from('students')   .select('*', { count: 'exact', head: true }),
        sb().from('teachers')   .select('*', { count: 'exact', head: true }),
        sb().from('admissions') .select('*', { count: 'exact', head: true })
          .eq('status', 'Pending')
      ]);
      return {
        totalStudents:    stuRes.count || 0,
        totalTeachers:    tchRes.count || 0,
        pendingAdmissions: admRes.count || 0
      };
    }
  };

  /* Public API */
  return { students, admissions, teachers, fees, results, announcements, timetables, stats };

})();
