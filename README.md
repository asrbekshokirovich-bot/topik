# TOPIK Station 🇰🇷

A full-stack **Korean language learning platform** for the TOPIK exam. Teachers
create classes, schedule live (Zoom / Google Meet) sessions, assign homework and
grade submissions; students join live sessions, submit homework, track grades,
and practice with an interactive vocabulary quiz.

- **Backend:** Node.js + Express + PostgreSQL (`pg`), JWT auth with role-based
  access control (STUDENT / TEACHER).
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router v6.
- **Database:** PostgreSQL 16 (via Docker Compose, zero config).

---

## Prerequisites

- **Node.js 18+** and npm
- **Docker** (for the zero-config PostgreSQL database)
  - _Alternative:_ a local **PostgreSQL 14+** server (see the manual fallback).

---

## Quick start (two commands)

```bash
npm run setup     # installs deps, starts Postgres in Docker, loads schema + seed data
npm run dev       # runs the backend (:4000) and frontend (:5173) together
```

Then open **http://localhost:5173**.

`npm run setup` runs three steps for you:

1. `install:all` — installs backend and frontend dependencies
2. `db:up` — `docker compose up -d` and waits until Postgres is healthy
3. `db:load` — loads `backend/schema.sql` (tables + seed data) into the database

> The `.env` files for both `backend/` and `frontend/` are already created with
> working defaults that match Docker Compose, so there is nothing to configure.

---

## Demo accounts

All demo accounts use the password **`Password123!`**.

| Role    | Email                     |
| ------- | ------------------------- |
| Teacher | `teacher.kim@topik.dev`   |
| Teacher | `teacher.lee@topik.dev`   |
| Student | `student.park@topik.dev`  |
| Student | `student.choi@topik.dev`  |
| Student | `student.han@topik.dev`   |

The login screen has one-click buttons to fill in the teacher/student demo
credentials.

---

## Useful scripts (root)

| Script                | What it does                                              |
| --------------------- | -------------------------------------------------------- |
| `npm run setup`       | Install deps + start DB + load schema (one command)      |
| `npm run dev`         | Run backend + frontend together (`concurrently`)         |
| `npm run install:all` | Install backend + frontend dependencies                  |
| `npm run db:up`       | Start the Postgres container and wait until healthy      |
| `npm run db:load`     | Load `backend/schema.sql` into the running database      |
| `npm run db:reset`    | Wipe the DB volume, restart, and reload the schema       |
| `npm run db:down`     | Stop the database container                              |

---

## Manual fallback (no Docker)

If you prefer your own PostgreSQL server:

1. Create a database, e.g. `topik_station`.
2. Edit `backend/.env` so `DATABASE_URL` points at your server, for example:
   ```
   DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/topik_station
   ```
3. Load the schema and seed data:
   ```bash
   psql "postgres://USER:PASSWORD@localhost:5432/topik_station" -f backend/schema.sql
   ```
4. Install and run:
   ```bash
   npm run install:all
   npm run dev
   ```

You can also run each side independently:

```bash
npm run dev --prefix backend     # API on http://localhost:4000
npm run dev --prefix frontend    # App on http://localhost:5173
```

---

## API endpoints

All `/api/*` routes (except signup/login) require an
`Authorization: Bearer <token>` header.

| Method | Endpoint                                   | Role    | Description                              |
| ------ | ------------------------------------------ | ------- | ---------------------------------------- |
| POST   | `/api/auth/signup`                         | public  | Register (STUDENT or TEACHER), get JWT   |
| POST   | `/api/auth/login`                          | public  | Log in, get JWT                          |
| GET    | `/api/auth/me`                             | any     | Current user                             |
| POST   | `/api/classes`                             | TEACHER | Create a class                           |
| GET    | `/api/classes`                             | any     | List classes (owned / enrolled)          |
| GET    | `/api/classes/:classId/students`           | TEACHER | List enrolled students                   |
| POST   | `/api/classes/:classId/enrollments`        | TEACHER | Enroll a student by email                |
| POST   | `/api/classes/:classId/schedules`          | TEACHER | Create a live session                    |
| GET    | `/api/classes/:classId/schedules`          | any     | List live sessions                       |
| PUT    | `/api/schedules/:id`                       | TEACHER | Update a live session                    |
| DELETE | `/api/schedules/:id`                       | TEACHER | Delete a live session                    |
| POST   | `/api/classes/:classId/homework`           | TEACHER | Create an assignment                     |
| GET    | `/api/classes/:classId/homework`           | any     | List assignments (+ submission status)   |
| POST   | `/api/homework/:homeworkId/submissions`    | STUDENT | Submit / resubmit homework               |
| GET    | `/api/homework/:homeworkId/submissions`    | TEACHER | List submissions for an assignment       |
| GET    | `/api/submissions/mine`                    | STUDENT | The student's grades across all classes  |
| PUT    | `/api/submissions/:id/grade`               | TEACHER | Grade a submission                       |
| GET    | `/health`                                  | public  | Health check                             |

---

## Project structure

```
topik-station/
├── package.json          # root runner (concurrently + db scripts)
├── docker-compose.yml     # PostgreSQL 16 service
├── scripts/wait-for-db.js # waits for DB health before loading schema
├── backend/               # Express API
│   ├── server.js
│   ├── schema.sql
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── controllers/
│   └── routes/
└── frontend/              # React + Vite + Tailwind
    └── src/
        ├── api/client.js
        ├── context/AuthContext.jsx
        └── components/
```
