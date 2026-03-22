-- ============================================================
--  Beginner's Field Nursery & Primary School — Supabase Schema
--  Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES (extends Supabase auth.users) ────────────────
create table if not exists profiles (
  id                  uuid references auth.users on delete cascade primary key,
  role                text not null check (role in ('admin','teacher','student','parent')),
  name                text not null,
  title               text,
  initials            text,
  email               text unique not null,
  portal              text,
  must_reset_password boolean default false,   -- ← true for auto-created parent accounts
  class_assigned      text,                    -- ← for teachers: their assigned class
  created_at          timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile"  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can read all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert profiles" on profiles for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── 2. STUDENTS ────────────────────────────────────────────────
create table if not exists students (
  id            uuid default gen_random_uuid() primary key,
  student_id    text unique not null,
  first_name    text not null,
  last_name     text not null,
  class         text not null,
  gender        text,
  parent_name   text,
  parent_phone  text,
  fee_status    text default 'Pending',
  attendance    text default '—',
  status        text default 'Active',
  parent_email  text,                          -- ← copied from admission on approval
  created_at    timestamptz default now()
);
alter table students enable row level security;
create policy "Admin and teacher can read students" on students for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "Admin can insert students" on students for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can update students" on students for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── 3. ADMISSIONS ──────────────────────────────────────────────
create table if not exists admissions (
  id              uuid default gen_random_uuid() primary key,
  student_name    text not null,
  class_applied   text not null,
  parent_name     text,
  parent_phone    text,
  parent_email    text,                        -- ← required for portal login
  date_of_birth   date,
  gender          text,
  previous_school text,
  home_address    text,
  occupation      text,
  relationship    text,
  status          text default 'Pending' check (status in ('Pending','Approved','Rejected')),
  serial_number   text,                        -- ← BFS/YEAR/0001 generated on approval
  temp_password   text,                        -- ← stored so admin can resend if needed
  rejection_note  text,                        -- ← optional note sent in rejection mail
  applied_date    date default current_date,
  created_at      timestamptz default now()
);
alter table admissions enable row level security;
create policy "Admin can do all on admissions" on admissions for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Public can insert admissions" on admissions for insert with check (true);

-- ── 4. TEACHERS ────────────────────────────────────────────────
create table if not exists teachers (
  id                  uuid default gen_random_uuid() primary key,
  name                text not null,
  class_assigned      text,
  subject             text,
  phone               text,
  email               text unique,
  attendance          text default '—',
  results_status      text default 'Pending',
  employment_status   text default 'Active',
  created_at          timestamptz default now()
);
alter table teachers enable row level security;
create policy "Admin can do all on teachers" on teachers for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers can read all teachers" on teachers for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- ── 5. FEES CONFIG ─────────────────────────────────────────────
create table if not exists fees_config (
  id         uuid default gen_random_uuid() primary key,
  fee_key    text unique not null,
  fee_value  integer not null default 0,
  updated_at timestamptz default now()
);
alter table fees_config enable row level security;
create policy "Anyone can read fees" on fees_config for select using (true);
create policy "Admin can update fees" on fees_config for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── 6. RESULTS (class-level) ────────────────────────────────────
create table if not exists results (
  id              uuid default gen_random_uuid() primary key,
  class_name      text not null,
  teacher_name    text,
  students_count  integer default 0,
  upload_status   text default 'Not Uploaded',
  uploaded_at     date,
  term            text default '3rd Term',
  session         text default '2024/2025',
  created_at      timestamptz default now()
);
alter table results enable row level security;
create policy "Admin can do all on results" on results for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers can read results" on results for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "Teachers can update results" on results for update using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- ── 7. ANNOUNCEMENTS ───────────────────────────────────────────
create table if not exists announcements (
  id         uuid default gen_random_uuid() primary key,
  title      text not null,
  body       text,
  audience   text,
  priority   text default 'normal',
  created_at timestamptz default now()
);
alter table announcements enable row level security;
create policy "Anyone can read announcements" on announcements for select using (true);
create policy "Admin can create announcements" on announcements for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ── 8. TIMETABLES ──────────────────────────────────────────────
create table if not exists timetables (
  id           uuid default gen_random_uuid() primary key,
  class_key    text unique not null,
  class_label  text,
  teacher_name text,
  status       text default 'draft',
  rows         jsonb,
  admin_note   text,
  updated_at   timestamptz default now()
);
alter table timetables enable row level security;
create policy "Anyone can read timetables" on timetables for select using (true);
create policy "Admin can update timetable status" on timetables for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers can upsert their timetable" on timetables for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- ============================================================
--  SEED DATA
-- ============================================================

-- Fees defaults
insert into fees_config (fee_key, fee_value) values
  ('nursery_tuition', 35000),
  ('nursery_creche',   8000),
  ('uniform',          3500),
  ('primary_tuition', 45000),
  ('ict',              3000),
  ('exam',            10000),
  ('dev_levy',         5000),
  ('pta',              2000),
  ('sports',           1500),
  ('medical',          1000)
on conflict (fee_key) do nothing;

-- Sample students
insert into students (student_id, first_name, last_name, class, gender, parent_name, parent_phone, fee_status, attendance, status) values
  ('BFS/2025/001', 'Adaeze',  'Nwosu',   'Primary 4', 'Female', 'Mr. Nwosu',   '0801 000 0001', 'Paid',    '98%',  'Active'),
  ('BFS/2025/002', 'Tunde',   'Afolabi', 'Primary 2', 'Male',   'Mr. Afolabi', '0801 000 0002', 'Owing',   '92%',  'Active'),
  ('BFS/2025/003', 'Mary',    'Ekwueme', 'Nursery 3', 'Female', 'Mrs. Ekwueme','0801 000 0003', 'Paid',    '100%', 'Active'),
  ('BFS/2025/004', 'Samuel',  'Ogunsi',  'Primary 6', 'Male',   'Mr. Ogunsi',  '0801 000 0004', 'Partial', '88%',  'Active')
on conflict (student_id) do nothing;

-- Sample admissions
insert into admissions (student_name, class_applied, parent_name, parent_phone, status, applied_date) values
  ('Chidera Obi',    'Primary 1', 'Mr. Obi',     '0801 234 5678', 'Pending',  '2025-03-18'),
  ('Fatima Bello',   'Nursery 2', 'Mrs. Bello',  '0802 345 6789', 'Approved', '2025-03-17'),
  ('Emeka Johnson',  'Primary 3', 'Mr. Johnson', '0803 456 7890', 'Rejected', '2025-03-16'),
  ('Ngozi Adeleke',  'Nursery 3', 'Dr. Adeleke', '0804 567 8901', 'Pending',  '2025-03-14'),
  ('Amara Eze',      'Nursery 1', 'Mrs. Eze',    '0805 678 9012', 'Approved', '2025-03-13')
on conflict do nothing;

-- Sample teachers
insert into teachers (name, class_assigned, subject, phone, email, attendance, results_status, employment_status) values
  ('Mr. Emeka Chukwu', 'Primary 6A', 'Mathematics',  '0801 111 2222', 'e.chukwu@beginnersfieldschool.edu.ng',  '98%',  'Uploaded', 'Active'),
  ('Mrs. Kemi Adamu',  'Primary 5B', 'English',       '0802 222 3333', 'k.adamu@beginnersfieldschool.edu.ng',   '95%',  'Pending',  'Active'),
  ('Miss Grace Okoye', 'Nursery 2',  'Class Teacher', '0803 333 4444', 'g.okoye@beginnersfieldschool.edu.ng',   '100%', 'Not Done', 'Active'),
  ('Mr. Femi Lawal',   'Primary 3',  'Science',       '0804 444 5555', 'f.lawal@beginnersfieldschool.edu.ng',   '90%',  'Uploaded', 'On Leave')
on conflict (email) do nothing;

-- Sample results
insert into results (class_name, teacher_name, students_count, upload_status, uploaded_at, term, session) values
  ('Primary 6A', 'Mr. Chukwu',  42, 'Published',        '2025-03-18', '3rd Term', '2024/2025'),
  ('Primary 5B', 'Mrs. Adamu',  38, 'Awaiting Approval', '2025-03-17', '3rd Term', '2024/2025'),
  ('Primary 3A', 'Mr. Lawal',   35, 'Published',        '2025-03-16', '3rd Term', '2024/2025'),
  ('Nursery 2',  'Miss Okoye',  28, 'Not Uploaded',      null,         '3rd Term', '2024/2025'),
  ('Nursery 1',  'Mrs. Balogun',25, 'Awaiting Approval', '2025-03-14', '3rd Term', '2024/2025')
on conflict do nothing;

-- Sample announcements
insert into announcements (title, audience, priority, created_at) values
  ('School Closes March 28, 2025 — Third Term', 'Everyone', 'normal',    '2025-03-10 09:00:00'),
  ('PTA Meeting — Saturday March 22',           'All Parents', 'important','2025-03-08 09:00:00'),
  ('Inter-House Sports Day — March 15',         'Everyone', 'normal',    '2025-03-05 09:00:00')
on conflict do nothing;

-- Timetable scaffolding (empty — teachers fill these in)
insert into timetables (class_key, class_label, teacher_name, status) values
  ('bfs_timetable_primary6a', 'Primary 6A', 'Mr. Emeka Chukwu', 'draft'),
  ('bfs_timetable_primary5b', 'Primary 5B', 'Mrs. Kemi Adamu',  'draft'),
  ('bfs_timetable_primary3a', 'Primary 3A', 'Mr. Femi Lawal',   'draft'),
  ('bfs_timetable_nursery2',  'Nursery 2',  'Miss Grace Okoye', 'draft'),
  ('bfs_timetable_nursery1',  'Nursery 1',  'Mrs. Balogun',     'draft')
on conflict (class_key) do nothing;

-- ============================================================
--  DEMO AUTH USERS  (run these AFTER creating the users 
--  manually in Authentication → Users in the Supabase UI,
--  then insert their UUIDs into profiles)
-- ============================================================
--  1. Go to Supabase Dashboard → Authentication → Users → Add User
--  2. Create:
--       admin@beginnersfieldschool.edu.ng   /  Admin@2025
--       e.chukwu@beginnersfieldschool.edu.ng / Teacher@2025
--       student@beginnersfieldschool.edu.ng  / Student@2025
--  3. Copy each user's UUID and insert below:

-- insert into profiles (id, role, name, title, initials, email, portal) values
--   ('<ADMIN_UUID>',   'admin',   'Mrs. Adaeze Okafor', 'Principal',           'AO', 'admin@beginnersfieldschool.edu.ng',   'admin.html'),
--   ('<TEACHER_UUID>', 'teacher', 'Mr. Emeka Chukwu',   'Class Teacher — P6A', 'EC', 'e.chukwu@beginnersfieldschool.edu.ng','teacher.html'),
--   ('<STUDENT_UUID>', 'student', 'Adaeze Nwosu',       'Primary 4 · 2024/2025','AN','student@beginnersfieldschool.edu.ng', 'student.html');

-- ============================================================
--  ADMISSION WORKFLOW ADDITIONS
--  Run this block AFTER the main schema if upgrading an
--  existing database, OR it is already included above for
--  fresh installs.
-- ============================================================

-- Sequence counter so serial numbers never collide
create sequence if not exists admission_serial_seq start 1;

-- Helper function: generate next serial  BFS/YEAR/NNNN
create or replace function next_admission_serial()
returns text language plpgsql as $$
declare
  yr   text := to_char(now(), 'YYYY');
  seq  int  := nextval('admission_serial_seq');
begin
  return 'BFS/' || yr || '/' || lpad(seq::text, 4, '0');
end;
$$;

-- ── PARENT_PROFILES view (safe read for teachers) ────────────
-- Teachers need to see parent accounts linked to their students
create or replace view parent_student_link as
  select
    s.id          as student_id,
    s.student_id  as student_code,
    s.first_name,
    s.last_name,
    s.class,
    s.parent_name,
    s.parent_phone,
    s.parent_email
  from students s;

-- RLS: teachers can read students in their class (already covered by students policy)

-- ── Admissions: public insert (already set), admin all ───────
-- (policies already created above; the new columns are included automatically)

-- ── Extra index for fast pending lookups ─────────────────────
create index if not exists idx_admissions_status on admissions(status);
create index if not exists idx_students_class    on students(class);
