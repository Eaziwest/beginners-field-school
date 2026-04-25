/* ============================================================
   Beginner's Field School — Database Layer (db.js)
   All Supabase operations in one place.
   ============================================================ */

const DB = (function () {

  function sb() {
    if (!window._supabase) throw new Error('[DB] Supabase client not initialised — check supabase-config.js');
    return window._supabase;
  }

  function sbAdmin() {
    if (!window._supabaseAdmin) throw new Error(
      '[DB] Admin Supabase client not configured.\n' +
      'Add your service_role key to SUPABASE_SERVICE_KEY in js/supabase-config.js\n' +
      '(Settings → API → service_role in your Supabase dashboard)'
    );
    return window._supabaseAdmin;
  }

  function fmtErr(e) {
    return (e && e.message) ? e.message : 'Database error — please try again.';
  }

  /* ══════════════════════════════════════════════════════
     SUBJECTS (Global Registry)
  ══════════════════════════════════════════════════════ */
  const subjects = {
    async getAll() {
      const { data, error } = await sb().from('subjects').select('*').order('name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async add(name) {
      const { data, error } = await sb().from('subjects').insert([{ name }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async delete(id) {
      const { error } = await sb().from('subjects').delete().eq('id', id);
      if (error) throw new Error(fmtErr(error));
    }
  };

  /* ══════════════════════════════════════════════════════
     STUDENTS
  ══════════════════════════════════════════════════════ */
  const students = {
    async getAll() {
      const { data, error } = await sb().from('students').select('*').order('created_at', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async getByClass(className) {
      if (!className) return [];
      const { data, error } = await sb()
        .from('students')
        .select('*')
        .ilike('class', className.trim())
        .order('first_name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async add({ firstName, lastName, className, gender, parentName, parentPhone, parentEmail }) {
      const { count } = await sb().from('students').select('*', { count: 'exact', head: true });
      const num   = String((count || 0) + 1).padStart(3, '0');
      const year  = new Date().getFullYear();
      const stuId = `BFS/${year}/${num}`;

      const { data, error } = await sb().from('students').insert([{
        student_id: stuId,
        first_name: firstName,
        last_name:  lastName,
        class:      className,
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
    }
  };

  /* ══════════════════════════════════════════════════════
     TEACHERS
  ══════════════════════════════════════════════════════ */
  const teachers = {
    async getAll() {
      const { data, error } = await sb().from('teachers').select('*').order('name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    /**
     * add — creates the teacher DB record only (no auth user).
     * Call createAccount() first if you want the teacher to be
     * able to log in.
     */
    async add({ name, phone, classAssigned, subjects, email }) {
      const subjectList = Array.isArray(subjects) ? subjects.join(', ') : subjects;
      const { data, error } = await sb().from('teachers').insert([{
        name, phone, class_assigned: classAssigned, subject: subjectList, email,
        attendance: '—', results_status: 'Pending', employment_status: 'Active'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    /**
     * createAccount — creates a Supabase Auth user + profile row for a teacher.
     * Requires window._supabaseAdmin (service role key).
     * @param {object} opts - { name, email, password, classAssigned, phone, subjects }
     * @returns {object} - { authUser, profile, teacher }
     */
    async createAccount({ name, email, password, classAssigned, phone, subjects: subjectList }) {
      // 1. Create auth user via admin API (does NOT affect current admin session)
      const { data: authData, error: authErr } = await sbAdmin().auth.admin.createUser({
        email:            email.trim().toLowerCase(),
        password,
        email_confirm:    true,   // mark email as confirmed immediately
        user_metadata:    { name, role: 'teacher' }
      });
      if (authErr) throw new Error('Auth error: ' + fmtErr(authErr));

      const userId = authData.user.id;

      // 2. Create profile row
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const { error: profErr } = await sbAdmin()
        .from('profiles')
        .insert([{
          id:             userId,
          role:           'teacher',
          name,
          title:          classAssigned ? `Class Teacher — ${classAssigned}` : 'Teacher',
          initials,
          email:          email.trim().toLowerCase(),
          portal:         'teacher.html',
          must_reset_password: true,   // teacher must change password on first login
          class_assigned: classAssigned || null
        }]);
      if (profErr) {
        // Roll back auth user to avoid orphaned accounts
        await sbAdmin().auth.admin.deleteUser(userId).catch(() => {});
        throw new Error('Profile error: ' + fmtErr(profErr));
      }

      // 3. Create teacher table row
      const subStr = Array.isArray(subjectList) ? subjectList.join(', ') : (subjectList || '');
      const { data: teacherRow, error: tchErr } = await sbAdmin()
        .from('teachers')
        .insert([{
          name, phone, class_assigned: classAssigned, subject: subStr, email: email.trim().toLowerCase(),
          attendance: '—', results_status: 'Pending', employment_status: 'Active'
        }]).select().single();
      if (tchErr) throw new Error('Teacher record error: ' + fmtErr(tchErr));

      return { userId, teacherRow };
    }
  };

  /* ══════════════════════════════════════════════════════
     ADMISSIONS
  ══════════════════════════════════════════════════════ */
  const admissions = {
    async getAll() {
      const { data, error } = await sb().from('admissions').select('*').order('applied_date', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    /* FIX #1 — submit() was entirely missing; the admission form depends on it */
    async submit({ studentName, classApplied, parentName, parentPhone, parentEmail,
                   dateOfBirth, gender, previousSchool, homeAddress, occupation,
                   relationship, notes }) {
      const { data, error } = await sb().from('admissions').insert([{
        student_name:    studentName,
        class_applied:   classApplied,
        parent_name:     parentName,
        parent_phone:    parentPhone,
        parent_email:    parentEmail    || null,
        date_of_birth:   dateOfBirth    || null,
        gender:          gender         || null,
        previous_school: previousSchool || null,
        home_address:    homeAddress    || null,
        occupation:      occupation     || null,
        relationship:    relationship   || null,
        notes:           notes          || null,
        status:          'Pending',
        applied_date:    new Date().toISOString()
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async updateStatus(id, status) {
      const { data, error } = await sb().from('admissions').update({ status }).eq('id', id).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     FEES
  ══════════════════════════════════════════════════════ */
  const fees = {
    async get() {
      const { data, error } = await sb().from('fees_config').select('fee_key, fee_value');
      if (error) throw new Error(fmtErr(error));
      return Object.fromEntries(data.map(r => [r.fee_key, r.fee_value]));
    },
    async save(feeMap) {
      const upserts = Object.entries(feeMap).map(([fee_key, fee_value]) => ({
        fee_key, fee_value: Number(fee_value) || 0, updated_at: new Date().toISOString()
      }));
      const { error } = await sb().from('fees_config').upsert(upserts, { onConflict: 'fee_key' });
      if (error) throw new Error(fmtErr(error));
    }
  };

  /* ══════════════════════════════════════════════════════
     STATS
  ══════════════════════════════════════════════════════ */
  const stats = {
    async getOverview() {
      const [stuRes, tchRes, admRes] = await Promise.all([
        sb().from('students').select('*', { count: 'exact', head: true }),
        sb().from('teachers').select('*', { count: 'exact', head: true }),
        sb().from('admissions').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
      ]);
      return {
        totalStudents:     stuRes.count || 0,
        totalTeachers:     tchRes.count || 0,
        pendingAdmissions: admRes.count || 0
      };
    }
  };

  /* ══════════════════════════════════════════════════════
     TIMETABLES
  ══════════════════════════════════════════════════════ */
  const timetables = {
    async getAll() {
      const { data, error } = await sb().from('timetables').select('*').order('updated_at', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async getByClass(className) {
      if (!className) return null;
      const { data, error } = await sb()
        .from('timetables')
        .select('*')
        .ilike('class_name', className.trim())
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async upsert({ className, rowsJson, status }) {
      const { data: existing } = await sb()
        .from('timetables')
        .select('id')
        .ilike('class_name', className.trim())
        .maybeSingle();

      if (existing) {
        const { data, error } = await sb()
          .from('timetables')
          .update({ rows_json: rowsJson, status: status || 'Draft', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select().single();
        if (error) throw new Error(fmtErr(error));
        return data;
      } else {
        const { data, error } = await sb()
          .from('timetables')
          .insert([{ class_name: className, rows_json: rowsJson, status: status || 'Draft' }])
          .select().single();
        if (error) throw new Error(fmtErr(error));
        return data;
      }
    },
    async updateStatus(id, status) {
      const { data, error } = await sb().from('timetables').update({ status }).eq('id', id).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     RESULTS (class-level summary)
  ══════════════════════════════════════════════════════ */
  const results = {
    async getAll() {
      const { data, error } = await sb().from('results').select('*').order('uploaded_at', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     STUDENT RESULTS (per-student scores)
  ══════════════════════════════════════════════════════ */
  const studentResults = {
    /**
     * getByClass — all student result rows for a given class.
     * Returns an array grouped-ready; each row has student_id,
     * student_name, subject, ca_score, exam_score, total_score, grade, remark.
     */
    async getByClass(className) {
      if (!className) return [];
      const { data, error } = await sb()
        .from('student_results')
        .select('*')
        .ilike('class_name', className.trim())
        .order('student_name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data || [];
    },

    /**
     * getByStudent — all subject rows for one student in a class.
     */
    async getByStudent(studentId, className) {
      if (!studentId) return [];
      let query = sb()
        .from('student_results')
        .select('*')
        .eq('student_id', studentId);
      if (className) query = query.ilike('class_name', className.trim());
      const { data, error } = await query.order('subject', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data || [];
    },

    /**
     * upsertBatch — save/update an array of student result rows.
     * Each item: { studentId, studentName, className, subject, term, session,
     *              caScore, examScore, totalScore, grade, remark, status }
     */
    async upsertBatch(rows) {
      if (!rows || !rows.length) return;
      const payload = rows.map(r => ({
        student_id:   r.studentId,
        student_name: r.studentName,
        class_name:   r.className,
        subject:      r.subject,
        term:         r.term  || '3rd Term',
        session:      r.session || '2024/2025',
        ca_score:     r.caScore    || 0,
        exam_score:   r.examScore  || 0,
        total_score:  r.totalScore || 0,
        grade:        r.grade  || 'F',
        remark:       r.remark || 'Needs Improvement',
        status:       r.status || 'draft',
        uploaded_at:  new Date().toISOString()
      }));
      const { error } = await sb()
        .from('student_results')
        .upsert(payload, { onConflict: 'student_id,class_name,subject,term,session' });
      if (error) throw new Error(fmtErr(error));
    }
  };

  /* ══════════════════════════════════════════════════════
     ANNOUNCEMENTS
  ══════════════════════════════════════════════════════ */
  const announcements = {
    async getAll() {
      const { data, error } = await sb().from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async create({ title, body, audience, priority }) {
      const { data, error } = await sb().from('announcements').insert([{
        title, body, audience: audience || 'Everyone', priority: priority || 'normal'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     MESSAGES
  ══════════════════════════════════════════════════════ */
  const messages = {
    async getForTeacher(teacherEmail) {
      if (!teacherEmail) return [];
      const { data, error } = await sb()
        .from('messages')
        .select('*')
        .or(`recipient_email.eq.${teacherEmail},audience.eq.teachers,audience.eq.all`)
        .order('created_at', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  return {
    students, subjects, teachers, admissions, fees,
    stats, timetables, results, studentResults, announcements, messages
  };

})();
