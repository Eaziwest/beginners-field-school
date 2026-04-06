/* ============================================================
   Beginner's Field School — Database Layer (db.js)
   All Supabase operations in one place.
   ============================================================ */

const DB = (function () {

  function sb() {
    if (!window._supabase) throw new Error('[DB] Supabase client not initialised — check supabase-config.js');
    return window._supabase;
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

    /* ── NEW: fetch students belonging to a specific class ── */
    async getByClass(className) {
      if (!className) return [];
      const { data, error } = await sb()
        .from('students')
        .select('*')
        .ilike('class', className.trim())   // case-insensitive match
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
    async add({ name, phone, classAssigned, subjects, email }) {
      const subjectList = Array.isArray(subjects) ? subjects.join(', ') : subjects;
      const { data, error } = await sb().from('teachers').insert([{
        name, phone, class_assigned: classAssigned, subject: subjectList, email,
        attendance: '—', results_status: 'Pending', employment_status: 'Active'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
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
        totalStudents:    stuRes.count || 0,
        totalTeachers:    tchRes.count || 0,
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
    /**
     * getByClass — fetch the approved/latest timetable for a given class.
     * class_name column holds the class (e.g. "Nursery 1", "Primary 3B").
     */
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
      return data; // null if none found
    },
    /**
     * upsert — insert or update a timetable draft for the given class.
     * rows_json should be JSON.stringify(array of row objects).
     */
    async upsert({ className, rowsJson, status }) {
      // Try update first, then insert
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
     RESULTS
  ══════════════════════════════════════════════════════ */
  const results = {
    async getAll() {
      const { data, error } = await sb().from('results').select('*').order('uploaded_at', { ascending: false });
      if (error) throw new Error(fmtErr(error));
      return data;
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
    /**
     * getForTeacher — fetch messages addressed to a specific teacher (by email or user_id).
     */
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
    stats, timetables, results, announcements, messages
  };

})();
