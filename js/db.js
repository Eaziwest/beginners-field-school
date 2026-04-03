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
      const { data, error } = await sb().from('students').select('*').order('created_at', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    },

    async add({ firstName, lastName, className, gender, parentName, parentPhone, parentEmail }) {
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

    async getByClass(className) {
      const { data, error } = await sb().from('students').select('*').eq('class', className).order('last_name', { ascending: true });
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
    },

    async submit(payload) {
      const { data, error } = await sb().from('admissions').insert([{ ...payload, status: 'Pending' }]).select().single();
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

    async add({ name, phone, classAssigned, subject, email }) {
      const { data, error } = await sb().from('teachers').insert([{
        name, phone, class_assigned: classAssigned, subject, email,
        attendance: '—', results_status: 'Pending', employment_status: 'Active'
      }]).select().single();
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  /* ══════════════════════════════════════════════════════
     FEES CONFIG
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
     RESULTS & ANNOUNCEMENTS & TIMETABLES
  ══════════════════════════════════════════════════════ */
  const results = {
    async getAll() {
      const { data, error } = await sb().from('results').select('*').order('class_name', { ascending: true });
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  const announcements = {
    async getAll() {
      const { data, error } = await sb().from('announcements').select('*').order('created_at', { ascending: false }).limit(20);
      if (error) throw new Error(fmtErr(error));
      return data;
    }
  };

  const timetables = {
    async get(classKey) {
      const { data, error } = await sb().from('timetables').select('*').eq('class_key', classKey).maybeSingle();
      if (error) throw new Error(fmtErr(error));
      return data;
    },
    async getAll() {
      const { data, error } = await sb().from('timetables').select('*').order('class_label', { ascending: true });
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
        sb().from('students').select('*', { count: 'exact', head: true }),
        sb().from('teachers').select('*', { count: 'exact', head: true }),
        sb().from('admissions').select('*', { count: 'exact', head: true }).eq('status', 'Pending')
      ]);
      return { totalStudents: stuRes.count || 0, totalTeachers: tchRes.count || 0, pendingAdmissions: admRes.count || 0 };
    }
  };

  /* Public API */
  return { students, admissions, teachers, fees, results, announcements, timetables, stats };

})();