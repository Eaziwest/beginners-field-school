/* ============================================================
   Beginner's Field School — Supabase Configuration
   ============================================================
   1. Go to https://supabase.com and create a free project
   2. In your project: Settings → API
   3. Copy "Project URL" into SUPABASE_URL below
   4. Copy "anon / public" key into SUPABASE_ANON_KEY below
   5. Copy "service_role" key into SUPABASE_SERVICE_KEY below
      ⚠️  NOTE: The service role key is used ONLY on the admin
      portal to create teacher auth accounts. It bypasses RLS.
      Keep this portal restricted to admin users only and never
      expose it publicly. For production, move teacher creation
      to a Supabase Edge Function instead.
   ============================================================ */

const SUPABASE_URL         = 'https://uekjhizytlqyzgbljbff.supabase.co';
const SUPABASE_ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVla2poaXp5dGxxeXpnYmxqYmZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjE2ODksImV4cCI6MjA4OTY5NzY4OX0.ybH1l7JdcUCYdK3OraeeQ8TQIRzSxyWok4lto1mEMA8';

/* ── Paste your service_role secret here (Admin portal only) ── */
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

/* ── Regular client (anon key — used everywhere) ── */
(function () {
  if (typeof supabase === 'undefined') {
    console.error('[BFS] Supabase JS library not loaded.');
    return;
  }
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.warn('[BFS] Supabase not configured yet.');
  }
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  /* ── Admin client (service role — for creating auth users) ── */
  if (SUPABASE_SERVICE_KEY && !SUPABASE_SERVICE_KEY.includes('YOUR_SERVICE')) {
    window._supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  } else {
    window._supabaseAdmin = null;
  }
})();
