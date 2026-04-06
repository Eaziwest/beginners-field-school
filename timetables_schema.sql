-- ================================================================
--  Beginner's Field School — Timetables SQL
--  Supports both Nursery and Primary school timetables.
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TIMETABLES TABLE
--    One row per class. rows_json stores the editable grid.
--    school_type is automatically derived from class_name.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timetables (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name   TEXT        NOT NULL UNIQUE,          -- e.g. "Nursery 1", "Primary 3B"
  school_type  TEXT        GENERATED ALWAYS AS (
                 CASE
                   WHEN lower(class_name) LIKE 'nursery%' THEN 'nursery'
                   WHEN lower(class_name) LIKE 'primary%' THEN 'primary'
                   ELSE 'other'
                 END
               ) STORED,                             -- auto: 'nursery' | 'primary' | 'other'
  rows_json    JSONB       NOT NULL DEFAULT '[]',    -- array of timetable row objects
  status       TEXT        NOT NULL DEFAULT 'Draft'  -- Draft | Pending Approval | Approved | Rejected
                           CHECK (status IN ('Draft','Pending Approval','Approved','Rejected')),
  submitted_by TEXT,                                 -- teacher email
  reviewed_by  TEXT,                                 -- admin email
  review_note  TEXT,                                 -- optional admin feedback
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS timetables_updated_at ON public.timetables;
CREATE TRIGGER timetables_updated_at
  BEFORE UPDATE ON public.timetables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Teachers: read all, insert/update their own class
CREATE POLICY "Teachers can read all timetables"
  ON public.timetables FOR SELECT
  USING (true);

CREATE POLICY "Teachers can upsert their own class timetable"
  ON public.timetables FOR INSERT
  WITH CHECK (true);   -- restrict further via submitted_by = auth.jwt() ->> 'email' if desired

CREATE POLICY "Teachers can update their own class timetable"
  ON public.timetables FOR UPDATE
  USING (true);

-- Admins: full access (service role bypasses RLS anyway)

-- ----------------------------------------------------------------
-- 3. SEED — one default row per class so teachers don't start blank
--    rows_json is left as an empty array; the frontend fills in the
--    default template when rows_json is empty.
-- ----------------------------------------------------------------

-- Nursery classes
INSERT INTO public.timetables (class_name, status) VALUES
  ('Nursery 1',  'Draft'),
  ('Nursery 2',  'Draft'),
  ('Nursery 3',  'Draft')
ON CONFLICT (class_name) DO NOTHING;

-- Primary classes
INSERT INTO public.timetables (class_name, status) VALUES
  ('Primary 1',  'Draft'),
  ('Primary 2',  'Draft'),
  ('Primary 3',  'Draft'),
  ('Primary 4',  'Draft'),
  ('Primary 5',  'Draft'),
  ('Primary 6',  'Draft')
ON CONFLICT (class_name) DO NOTHING;

-- ----------------------------------------------------------------
-- 4. MESSAGES TABLE (for teacher Messages tab)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name      TEXT        NOT NULL DEFAULT 'School Admin',
  sender_email     TEXT,
  recipient_email  TEXT,                              -- NULL = broadcast
  audience         TEXT        NOT NULL DEFAULT 'all' -- all | teachers | students | parents
                               CHECK (audience IN ('all','teachers','students','parents')),
  subject          TEXT        NOT NULL,
  body             TEXT        NOT NULL,
  is_read          BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read messages addressed to them or broadcast
CREATE POLICY "Recipients can read their messages"
  ON public.messages FOR SELECT
  USING (
    recipient_email IS NULL                         -- broadcast
    OR recipient_email = auth.jwt() ->> 'email'     -- direct message
    OR audience IN ('all', 'teachers')              -- role broadcast
  );

-- Only service role (admin) can insert messages
-- (frontend inserts go through the Edge Function or admin portal with service key)

-- ----------------------------------------------------------------
-- 5. USEFUL VIEWS
-- ----------------------------------------------------------------

-- Summary: one row per class showing timetable approval status
CREATE OR REPLACE VIEW public.timetable_summary AS
SELECT
  id,
  class_name,
  school_type,
  status,
  submitted_by,
  reviewed_by,
  updated_at
FROM public.timetables
ORDER BY
  school_type,
  class_name;

-- ----------------------------------------------------------------
-- 6. QUICK SANITY CHECK
--    Run this after migration to confirm everything was created.
-- ----------------------------------------------------------------
SELECT class_name, school_type, status, updated_at
FROM   public.timetables
ORDER  BY school_type, class_name;
