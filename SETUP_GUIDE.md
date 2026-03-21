# 🌱 Beginner's Field School — Supabase Integration Guide

This guide walks you from zero to a fully live, database-backed school portal in about 15 minutes.

---

## What changed

| Before | After |
|--------|-------|
| Hardcoded passwords in `auth.js` | Real email/password auth via Supabase Auth |
| Static HTML tables for students, teachers, admissions | Live data from Supabase Postgres |
| `localStorage` for timetables | Timetables stored in the cloud — shared across all devices |
| Fees hardcoded in HTML | Admin saves fees to DB; students see live amounts |
| Announcements lost on refresh | Announcements persist in DB |

**New files added:**
- `js/supabase-config.js` — your project URL + anon key (you fill this in)
- `js/db.js` — all database operations in one place
- `SUPABASE_SETUP.sql` — run once to create all tables and seed data

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** → Sign up (free)
2. Click **New project**
3. Give it a name (e.g. `beginners-field-school`), set a strong database password, choose any region
4. Wait ~2 minutes for it to provision

---

## Step 2 — Run the SQL setup

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `SUPABASE_SETUP.sql` from this project folder
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **Run** (green button)

You should see `Success. No rows returned` — that means all tables, policies and seed data were created.

---

## Step 3 — Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy your **Project URL** (looks like `https://abcdefgh.supabase.co`)
3. Copy the **anon / public** key (long string starting with `eyJ...`)

---

## Step 4 — Connect the app

Open `js/supabase-config.js` and replace the placeholders:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';  // ← paste here
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';                   // ← paste here
```

Save the file.

---

## Step 5 — Create the three demo user accounts

Supabase Auth handles passwords securely. You need to create the accounts manually:

1. In Supabase, go to **Authentication → Users**
2. Click **Add user → Create new user**
3. Create all three:

| Email | Password | Role |
|-------|----------|------|
| `admin@beginnersfieldschool.edu.ng` | `Admin@2025` | admin |
| `e.chukwu@beginnersfieldschool.edu.ng` | `Teacher@2025` | teacher |
| `student@beginnersfieldschool.edu.ng` | `Student@2025` | student |

4. After creating each user, click on their row to copy their **UUID** (looks like `a1b2c3d4-...`)

---

## Step 6 — Link profiles to auth users

Back in the **SQL Editor**, run this query (replace the UUIDs with the ones you just copied):

```sql
insert into profiles (id, role, name, title, initials, email, portal) values
  ('<ADMIN_UUID>',   'admin',   'Mrs. Adaeze Okafor', 'Principal',             'AO', 'admin@beginnersfieldschool.edu.ng',    'admin.html'),
  ('<TEACHER_UUID>', 'teacher', 'Mr. Emeka Chukwu',   'Class Teacher — P6A',   'EC', 'e.chukwu@beginnersfieldschool.edu.ng', 'teacher.html'),
  ('<STUDENT_UUID>', 'student', 'Adaeze Nwosu',       'Primary 4 · 2024/2025', 'AN', 'student@beginnersfieldschool.edu.ng',  'student.html');
```

---

## Step 7 — Open the app

Open `pages/login.html` in your browser. Use any of the three credentials above to log in.

> **Running locally?** You may need a local web server (e.g. VS Code's Live Server extension, or `npx serve .`) because browsers block some JS modules when opening files directly from the filesystem.

---

## How each portal works now

### 🏛️ Admin Portal
| Section | Data source |
|---------|-------------|
| Overview stats | Aggregated live counts from DB |
| Admission applications | `admissions` table — approve/reject saves to DB instantly |
| Students | `students` table — Add Student form writes to DB |
| Teachers | `teachers` table — Add Teacher form writes to DB |
| School Fees | `fees_config` table — Save Changes writes all fee values |
| Results | `results` table — approve/reject persists status |
| Timetables | `timetables` table — review and approve/reject from DB |
| Announcements | `announcements` table — new announcements saved and listed live |

### 👩‍🏫 Teacher Portal
| Section | Data source |
|---------|-------------|
| Timetable | `timetables` table — saves/submits to DB (replaced localStorage) |

### 🎒 Student Portal
| Section | Data source |
|---------|-------------|
| School Fees | `fees_config` table — always shows latest admin-set amounts |
| Timetable | `timetables` table — shows only when admin has approved it |

---

## Adding more users

To add a real teacher or student login:

1. Create their account in **Supabase → Authentication → Users**
2. Copy their UUID
3. Insert a row into `profiles` via SQL Editor:

```sql
insert into profiles (id, role, name, title, initials, email, portal) values
  ('<UUID>', 'teacher', 'Mrs. New Teacher', 'Class Teacher — P5A', 'NT',
   'n.teacher@beginnersfieldschool.edu.ng', 'teacher.html');
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Supabase is not configured" on login | Update `js/supabase-config.js` with your real URL and key |
| "Account found but no school profile exists" | Run the Step 6 SQL to insert profile rows |
| Data loads but tables are empty | Re-run `SUPABASE_SETUP.sql` to re-seed sample data |
| Login says "Invalid login credentials" | Make sure you created the users in Supabase Auth (Step 5) |
| Timetables show blank | Admin must approve a teacher's timetable submission first |
| CORS error in browser console | You must serve the files via a web server, not `file://` |

---

## Project structure

```
beginners-field-school/
├── pages/
│   ├── login.html        ← Supabase Auth login
│   ├── admin.html        ← All DB data loaded on init
│   ├── teacher.html      ← Timetable saves to Supabase
│   └── student.html      ← Live fees + timetable
├── js/
│   ├── supabase-config.js  ← ⭐ YOUR KEYS GO HERE
│   ├── db.js               ← All DB operations (students, fees, etc.)
│   ├── auth.js             ← Supabase Auth helpers
│   └── main.js             ← UI helpers (tabs, modals, toast)
├── css/
│   └── style.css
├── SUPABASE_SETUP.sql      ← Run once in Supabase SQL Editor
└── SETUP_GUIDE.md          ← This file
```
