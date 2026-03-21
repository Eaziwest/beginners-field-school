-- ============================================================
--  Beginner's Field Nursery & Primary School — Database Schema
--  Run: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS beginners_field_school
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE beginners_field_school;

-- ─────────────────────────────────────────
--  USERS  (admin, teacher, student)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role        ENUM('admin','teacher','student') NOT NULL,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,   -- bcrypt hash
  title       VARCHAR(120),
  initials    VARCHAR(5),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────
--  CLASSES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(30) NOT NULL UNIQUE,   -- e.g. 'Primary 6A'
  level       ENUM('nursery','primary') NOT NULL,
  teacher_id  INT UNSIGNED,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  STUDENTS  (extra profile info)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL UNIQUE,
  student_no  VARCHAR(20) NOT NULL UNIQUE,   -- e.g. BFS/2025/001
  class_id    INT UNSIGNED,
  gender      ENUM('Male','Female','Other'),
  dob         DATE,
  parent_name VARCHAR(120),
  parent_phone VARCHAR(20),
  address     TEXT,
  enrolled_on DATE DEFAULT (CURRENT_DATE),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id)  ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  TEACHERS  (extra profile info)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL UNIQUE,
  phone       VARCHAR(20),
  subject     VARCHAR(80),
  joined_on   DATE DEFAULT (CURRENT_DATE),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────
--  SUBJECTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(80) NOT NULL UNIQUE
);

-- ─────────────────────────────────────────
--  ADMISSIONS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admissions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_no VARCHAR(20) NOT NULL UNIQUE,
  child_name     VARCHAR(120) NOT NULL,
  dob            DATE,
  gender         ENUM('Male','Female','Other'),
  class_applied  VARCHAR(30) NOT NULL,
  parent_name    VARCHAR(120),
  parent_phone   VARCHAR(20),
  parent_email   VARCHAR(160),
  address        TEXT,
  prev_school    VARCHAR(160),
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  admin_note     TEXT,
  submitted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at    TIMESTAMP NULL,
  reviewed_by    INT UNSIGNED,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  ATTENDANCE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id  INT UNSIGNED NOT NULL,
  class_id    INT UNSIGNED,
  date        DATE NOT NULL,
  period      VARCHAR(60) DEFAULT 'Morning Roll Call',
  status      ENUM('present','absent','late') NOT NULL,
  note        VARCHAR(255),
  marked_by   INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_date_period (student_id, date, period),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id)   REFERENCES classes(id)  ON DELETE SET NULL,
  FOREIGN KEY (marked_by)  REFERENCES users(id)    ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  RESULTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id  INT UNSIGNED NOT NULL,
  class_id    INT UNSIGNED,
  subject_id  INT UNSIGNED NOT NULL,
  term        TINYINT NOT NULL,          -- 1, 2, or 3
  session     VARCHAR(12) NOT NULL,      -- e.g. '2024/2025'
  ca_score    DECIMAL(5,2),
  exam_score  DECIMAL(5,2),
  total       DECIMAL(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade       VARCHAR(2),
  remark      VARCHAR(80),
  uploaded_by INT UNSIGNED,
  status      ENUM('draft','submitted','approved','published') NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_result (student_id, subject_id, term, session),
  FOREIGN KEY (student_id)  REFERENCES students(id)  ON DELETE CASCADE,
  FOREIGN KEY (class_id)    REFERENCES classes(id)   ON DELETE SET NULL,
  FOREIGN KEY (subject_id)  REFERENCES subjects(id)  ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)     ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  TIMETABLES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetables (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  class_id     INT UNSIGNED NOT NULL,
  teacher_id   INT UNSIGNED,
  term         TINYINT NOT NULL,
  session      VARCHAR(12) NOT NULL,
  rows_json    JSON NOT NULL,    -- array of {type, time, days[], label?}
  status       ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
  admin_note   TEXT,
  submitted_at TIMESTAMP NULL,
  reviewed_at  TIMESTAMP NULL,
  reviewed_by  INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_timetable (class_id, term, session),
  FOREIGN KEY (class_id)    REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id)  REFERENCES users(id)   ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)   ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  FEE SCHEDULE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_schedule (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  term        TINYINT NOT NULL,
  session     VARCHAR(12) NOT NULL,
  level       ENUM('nursery','primary') NOT NULL,
  item_name   VARCHAR(100) NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  is_optional BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by  INT UNSIGNED,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fee (term, session, level, item_name),
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  ANNOUNCEMENTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  audience    VARCHAR(80) NOT NULL,   -- 'Everyone', 'All Students', etc.
  priority    ENUM('normal','important','urgent') NOT NULL DEFAULT 'normal',
  created_by  INT UNSIGNED,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  FILE UPLOADS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploads (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  filename     VARCHAR(255) NOT NULL,   -- stored name on disk
  original     VARCHAR(255),            -- original filename
  mime_type    VARCHAR(80),
  size_bytes   INT UNSIGNED,
  entity_type  VARCHAR(40),             -- 'admission', 'result', etc.
  entity_id    INT UNSIGNED,
  uploaded_by  INT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────
--  MESSAGES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  from_user   INT UNSIGNED NOT NULL,
  to_user     INT UNSIGNED NOT NULL,
  subject     VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (to_user)   REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  SEED DATA
-- ============================================================

-- Passwords are bcrypt hashes of the values shown in comments
-- Admin@2025 | Teacher@2025 | Student@2025
INSERT INTO users (role, name, email, password, title, initials) VALUES
('admin',   'Mrs. Adaeze Okafor',   'admin@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Principal', 'AO'),
('teacher', 'Mr. Emeka Chukwu',     'e.chukwu@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Class Teacher — P6A', 'EC'),
('teacher', 'Mrs. Kemi Adamu',      'k.adamu@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Class Teacher — P5B', 'KA'),
('teacher', 'Miss Grace Okoye',     'g.okoye@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Class Teacher — N2', 'GO'),
('teacher', 'Mr. Femi Lawal',       'f.lawal@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Class Teacher — P3A', 'FL'),
('student', 'Adaeze Nwosu',         'student@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Primary 4 · 2024/2025', 'AN'),
('student', 'Tunde Afolabi',        'tunde.afolabi@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Primary 2 · 2024/2025', 'TA'),
('student', 'Mary Ekwueme',         'mary.ekwueme@beginnersfieldschool.edu.ng',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Nursery 3 · 2024/2025', 'ME');

-- NOTE: The hash above is the bcrypt hash of 'password' (Laravel placeholder).
-- Run `node backend/db/seed.js` to re-hash with the real passwords.

INSERT INTO classes (name, level, teacher_id) VALUES
('Nursery 1', 'nursery', NULL),
('Nursery 2', 'nursery', 4),
('Nursery 3', 'nursery', NULL),
('Primary 1', 'primary', NULL),
('Primary 2', 'primary', NULL),
('Primary 3A','primary', 5),
('Primary 4', 'primary', NULL),
('Primary 5B','primary', 3),
('Primary 6A','primary', 2);

INSERT INTO teachers (user_id, phone, subject) VALUES
(2, '0801 111 2222', 'Mathematics'),
(3, '0802 222 3333', 'English'),
(4, '0803 333 4444', 'Class Teacher'),
(5, '0804 444 5555', 'Science');

INSERT INTO students (user_id, student_no, class_id, gender, parent_name, parent_phone) VALUES
(6, 'BFS/2025/001', 7, 'Female', 'Mr. Nwosu',   '0811 111 1111'),
(7, 'BFS/2025/002', 5, 'Male',   'Mr. Afolabi',  '0822 222 2222'),
(8, 'BFS/2025/003', 3, 'Female', 'Mrs. Ekwueme', '0833 333 3333');

INSERT INTO subjects (name) VALUES
('Mathematics'), ('English Language'), ('Basic Science'),
('Social Studies'), ('Yoruba Language'), ('ICT'),
('Physical Education'), ('Religious Studies'), ('Creative Arts');

INSERT INTO fee_schedule (term, session, level, item_name, amount, is_optional) VALUES
(3, '2024/2025', 'nursery', 'School Fees',        35000.00, FALSE),
(3, '2024/2025', 'nursery', 'Development Levy',    5000.00, FALSE),
(3, '2024/2025', 'nursery', 'PTA Dues',            2000.00, FALSE),
(3, '2024/2025', 'nursery', 'Sports/Cultural',     1500.00, FALSE),
(3, '2024/2025', 'nursery', 'Medical/Health',      1000.00, FALSE),
(3, '2024/2025', 'nursery', 'Creche/Extra Hours',  8000.00, TRUE),
(3, '2024/2025', 'primary', 'School Fees',        45000.00, FALSE),
(3, '2024/2025', 'primary', 'Development Levy',    5000.00, FALSE),
(3, '2024/2025', 'primary', 'PTA Dues',            2000.00, FALSE),
(3, '2024/2025', 'primary', 'Sports/Cultural',     1500.00, FALSE),
(3, '2024/2025', 'primary', 'Medical/Health',      1000.00, FALSE),
(3, '2024/2025', 'primary', 'ICT/Computer Levy',   3000.00, FALSE),
(3, '2024/2025', 'primary', 'Uniform (per set)',   3500.00, TRUE);

INSERT INTO announcements (title, body, audience, priority, created_by) VALUES
('School Closes March 28, 2025 — Third Term',
 'All students should ensure assignments are completed before the closing date. Report cards will be available for download after the closing date.',
 'Everyone', 'normal', 1),
('PTA Meeting — Saturday March 22',
 'All parents and guardians are invited to the PTA meeting at the school hall. Time: 10:00 AM.',
 'All Parents', 'important', 1),
('Inter-House Sports Day — March 15',
 'Wear your house colours. Events begin at 8:00 AM sharp. Parents are welcome to attend.',
 'Everyone', 'normal', 1);
