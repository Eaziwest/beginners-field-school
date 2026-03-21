/* ============================================================
   Beginner's Field School — Supabase Configuration
   ============================================================
   1. Go to https://supabase.com and create a free project
   2. In your project: Settings → API
   3. Copy "Project URL" into SUPABASE_URL below
   4. Copy "anon / public" key into SUPABASE_ANON_KEY below
   ============================================================ */

const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

/* Initialise the Supabase client and expose it globally */
(function () {
  if (typeof supabase === 'undefined') {
    console.error('[BFS] Supabase JS library not loaded. Make sure the CDN <script> tag appears before supabase-config.js');
    return;
  }
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID')) {
    console.warn('[BFS] Supabase not configured yet — update js/supabase-config.js with your project URL and anon key.');
  }
  window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
