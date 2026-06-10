-- TOPIK Station — PostgreSQL schema & seed data
-- Safe to run repeatedly: drops and recreates everything.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Drop existing objects (children first via CASCADE).
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS homework CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS stream_platform CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER');
CREATE TYPE stream_platform AS ENUM ('ZOOM', 'GOOGLE_MEET', 'OTHER');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classes (
  id          SERIAL PRIMARY KEY,
  teacher_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE enrollments (
  id          SERIAL PRIMARY KEY,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, student_id)
);

CREATE TABLE schedules (
  id         SERIAL PRIMARY KEY,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  platform   stream_platform NOT NULL DEFAULT 'OTHER',
  live_link  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE TABLE homework (
  id          SERIAL PRIMARY KEY,
  class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  max_score   INTEGER NOT NULL DEFAULT 100 CHECK (max_score BETWEEN 1 AND 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE submissions (
  id           SERIAL PRIMARY KEY,
  homework_id  INTEGER NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT,
  link         TEXT,
  score        INTEGER CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  feedback     TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at    TIMESTAMPTZ,
  UNIQUE (homework_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_schedules_class ON schedules(class_id);
CREATE INDEX idx_schedules_start ON schedules(start_time);
CREATE INDEX idx_homework_class ON homework(class_id);
CREATE INDEX idx_submissions_homework ON submissions(homework_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);

-- ---------------------------------------------------------------------------
-- Seed data — passwords are bcrypt hashes of 'Password123!'
-- (crypt + gen_salt('bf', 10) is verified by bcryptjs.compare).
-- ---------------------------------------------------------------------------
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('teacher.kim@topik.dev',  crypt('Password123!', gen_salt('bf', 10)), 'Kim Min-jun',    'TEACHER'),
  ('teacher.lee@topik.dev',  crypt('Password123!', gen_salt('bf', 10)), 'Lee Seo-yeon',   'TEACHER'),
  ('student.park@topik.dev', crypt('Password123!', gen_salt('bf', 10)), 'Park Ji-ho',     'STUDENT'),
  ('student.choi@topik.dev', crypt('Password123!', gen_salt('bf', 10)), 'Choi Eun-woo',   'STUDENT'),
  ('student.han@topik.dev',  crypt('Password123!', gen_salt('bf', 10)), 'Han Yu-na',      'STUDENT');

-- Classes
INSERT INTO classes (teacher_id, title, description) VALUES
  ((SELECT id FROM users WHERE email = 'teacher.kim@topik.dev'),
   'TOPIK I — Beginner Korean',
   'Foundations of Korean: Hangul, basic grammar, and everyday vocabulary for TOPIK level 1-2.'),
  ((SELECT id FROM users WHERE email = 'teacher.kim@topik.dev'),
   'TOPIK II — Intermediate Reading',
   'Reading strategies and grammar for TOPIK level 3-4.'),
  ((SELECT id FROM users WHERE email = 'teacher.lee@topik.dev'),
   'Korean Conversation Lab',
   'Live speaking practice and listening drills for all levels.');

-- Enrollments
INSERT INTO enrollments (class_id, student_id) VALUES
  ((SELECT id FROM classes WHERE title = 'TOPIK I — Beginner Korean'),
   (SELECT id FROM users WHERE email = 'student.park@topik.dev')),
  ((SELECT id FROM classes WHERE title = 'TOPIK I — Beginner Korean'),
   (SELECT id FROM users WHERE email = 'student.choi@topik.dev')),
  ((SELECT id FROM classes WHERE title = 'TOPIK I — Beginner Korean'),
   (SELECT id FROM users WHERE email = 'student.han@topik.dev')),
  ((SELECT id FROM classes WHERE title = 'TOPIK II — Intermediate Reading'),
   (SELECT id FROM users WHERE email = 'student.park@topik.dev')),
  ((SELECT id FROM classes WHERE title = 'Korean Conversation Lab'),
   (SELECT id FROM users WHERE email = 'student.choi@topik.dev'));

-- Schedules (live sessions) — Zoom and Google Meet links
INSERT INTO schedules (class_id, title, start_time, end_time, platform, live_link) VALUES
  ((SELECT id FROM classes WHERE title = 'TOPIK I — Beginner Korean'),
   'Hangul Bootcamp — Live',
   NOW() + INTERVAL '1 day',
   NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
   'ZOOM',
   'https://zoom.us/j/9876543210?pwd=topik1beginner'),
  ((SELECT id FROM classes WHERE title = 'TOPIK I — Beginner Korean'),
   'Vocabulary Review Session',
   NOW() + INTERVAL '3 days',
   NOW() + INTERVAL '3 days' + INTERVAL '90 minutes',
   'GOOGLE_MEET',
   'https://meet.google.com/abc-defg-hij'),
  ((SELECT id FROM classes WHERE title = 'TOPIK II — Intermediate Reading'),
   'Reading Comprehension Workshop',
   NOW() + INTERVAL '2 days',
   NOW() + INTERVAL '2 days' + INTERVAL '1 hour',
   'GOOGLE_MEET',
   'https://meet.google.com/xyz-uvwx-yz'),
  ((SELECT id FROM classes WHERE title = 'Korean Conversation Lab'),
   'Speaking Practice — Café Roleplay',
   NOW() + INTERVAL '5 days',
   NOW() + INTERVAL '5 days' + INTERVAL '1 hour',
   'ZOOM',
   'https://zoom.us/j/1234509876?pwd=conversationlab');

-- Homework
INSERT INTO homework (class_id, title, description, due_date, max_score) VALUES
  ((SELECT id FROM classes WHERE title = 'TOPIK I — Beginner Korean'),
   'Hangul Writing Practice',
   'Write 10 sentences using the vocabulary from this week. Submit as text or a link to your document.',
   NOW() + INTERVAL '7 days',
   100);

-- One graded submission (Park submits the Hangul homework, graded 92/100)
INSERT INTO submissions (homework_id, student_id, content, link, score, feedback, graded_at) VALUES
  ((SELECT id FROM homework WHERE title = 'Hangul Writing Practice'),
   (SELECT id FROM users WHERE email = 'student.park@topik.dev'),
   '안녕하세요. 저는 박지호입니다. 한국어를 공부합니다.',
   NULL,
   92,
   'Great work! Watch your spacing on 공부합니다. Keep it up. 잘했어요!',
   NOW());
