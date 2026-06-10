'use strict';

const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../middleware/auth');

const PLATFORMS = ['ZOOM', 'GOOGLE_MEET', 'OTHER'];

/* ------------------------------------------------------------------ */
/* Access-check helpers                                                */
/* ------------------------------------------------------------------ */

/** Returns the class row if it exists, otherwise null. */
async function getClassById(classId) {
  const result = await db.query('SELECT * FROM classes WHERE id = $1', [
    classId,
  ]);
  return result.rows[0] || null;
}

/** True when the given teacher owns the class. */
function isClassOwner(klass, teacherId) {
  return klass && Number(klass.teacher_id) === Number(teacherId);
}

/** True when the given student is enrolled in the class. */
async function isEnrolled(classId, studentId) {
  const result = await db.query(
    'SELECT 1 FROM enrollments WHERE class_id = $1 AND student_id = $2',
    [classId, studentId]
  );
  return result.rowCount > 0;
}

/**
 * Resolve whether req.user may access a class (teacher owner or enrolled
 * student). Returns { ok, status, error, klass }.
 */
async function resolveAccess(classId, user) {
  const klass = await getClassById(classId);
  if (!klass) {
    return { ok: false, status: 404, error: 'Class not found.' };
  }
  if (user.role === ROLES.TEACHER) {
    if (!isClassOwner(klass, user.id)) {
      return { ok: false, status: 403, error: 'You do not own this class.' };
    }
    return { ok: true, klass };
  }
  // STUDENT
  if (!(await isEnrolled(classId, user.id))) {
    return {
      ok: false,
      status: 403,
      error: 'You are not enrolled in this class.',
    };
  }
  return { ok: true, klass };
}

/* ------------------------------------------------------------------ */
/* Classes                                                            */
/* ------------------------------------------------------------------ */

/** POST /api/classes  (TEACHER) */
const createClass = asyncHandler(async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Class title is required.' });
  }

  const result = await db.query(
    `INSERT INTO classes (teacher_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [req.user.id, String(title).trim(), description ? String(description) : null]
  );

  return res.status(201).json({ class: result.rows[0] });
});

/** GET /api/classes  (TEACHER: owned w/ student_count, STUDENT: enrolled w/ teacher_name) */
const listClasses = asyncHandler(async (req, res) => {
  if (req.user.role === ROLES.TEACHER) {
    const result = await db.query(
      `SELECT c.*,
              COUNT(e.id)::int AS student_count
       FROM classes c
       LEFT JOIN enrollments e ON e.class_id = c.id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    return res.json({ classes: result.rows });
  }

  const result = await db.query(
    `SELECT c.*,
            u.full_name AS teacher_name,
            e.enrolled_at
     FROM enrollments e
     JOIN classes c ON c.id = e.class_id
     JOIN users u ON u.id = c.teacher_id
     WHERE e.student_id = $1
     ORDER BY e.enrolled_at DESC`,
    [req.user.id]
  );
  return res.json({ classes: result.rows });
});

/** GET /api/classes/:classId/students  (TEACHER owner) */
const listStudents = asyncHandler(async (req, res) => {
  const klass = await getClassById(req.params.classId);
  if (!klass) return res.status(404).json({ error: 'Class not found.' });
  if (!isClassOwner(klass, req.user.id)) {
    return res.status(403).json({ error: 'You do not own this class.' });
  }

  const result = await db.query(
    `SELECT u.id, u.full_name, u.email, e.enrolled_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     WHERE e.class_id = $1
     ORDER BY u.full_name ASC`,
    [req.params.classId]
  );
  return res.json({ students: result.rows });
});

/** POST /api/classes/:classId/enrollments  (TEACHER owner) — enroll by email */
const enrollStudent = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email || !String(email).trim()) {
    return res.status(400).json({ error: 'Student email is required.' });
  }

  const klass = await getClassById(req.params.classId);
  if (!klass) return res.status(404).json({ error: 'Class not found.' });
  if (!isClassOwner(klass, req.user.id)) {
    return res.status(403).json({ error: 'You do not own this class.' });
  }

  const student = await db.query(
    'SELECT id, full_name, email, role FROM users WHERE email = $1',
    [String(email).trim().toLowerCase()]
  );
  if (student.rowCount === 0) {
    return res.status(404).json({ error: 'No user found with that email.' });
  }
  if (student.rows[0].role !== ROLES.STUDENT) {
    return res
      .status(400)
      .json({ error: 'That user is not a student.' });
  }

  const result = await db.query(
    `INSERT INTO enrollments (class_id, student_id)
     VALUES ($1, $2)
     ON CONFLICT (class_id, student_id) DO NOTHING
     RETURNING id`,
    [req.params.classId, student.rows[0].id]
  );

  if (result.rowCount === 0) {
    return res
      .status(409)
      .json({ error: 'That student is already enrolled.' });
  }

  return res.status(201).json({
    enrolled: true,
    student: {
      id: student.rows[0].id,
      fullName: student.rows[0].full_name,
      email: student.rows[0].email,
    },
  });
});

/* ------------------------------------------------------------------ */
/* Schedules (live streams)                                           */
/* ------------------------------------------------------------------ */

function validateScheduleBody(body) {
  const { title, startTime, endTime, platform, liveLink } = body || {};
  if (!title || !String(title).trim()) return 'Schedule title is required.';
  if (!startTime) return 'startTime is required.';
  if (!endTime) return 'endTime is required.';
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime())) return 'startTime is invalid.';
  if (Number.isNaN(end.getTime())) return 'endTime is invalid.';
  if (end <= start) return 'endTime must be after startTime.';
  if (!platform || !PLATFORMS.includes(platform)) {
    return 'platform must be one of ZOOM, GOOGLE_MEET, OTHER.';
  }
  if (!liveLink || !String(liveLink).trim()) return 'liveLink is required.';
  return null;
}

/** POST /api/classes/:classId/schedules  (TEACHER owner) */
const createSchedule = asyncHandler(async (req, res) => {
  const klass = await getClassById(req.params.classId);
  if (!klass) return res.status(404).json({ error: 'Class not found.' });
  if (!isClassOwner(klass, req.user.id)) {
    return res.status(403).json({ error: 'You do not own this class.' });
  }

  const validationError = validateScheduleBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { title, startTime, endTime, platform, liveLink } = req.body;
  const result = await db.query(
    `INSERT INTO schedules (class_id, title, start_time, end_time, platform, live_link)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      req.params.classId,
      String(title).trim(),
      startTime,
      endTime,
      platform,
      String(liveLink).trim(),
    ]
  );
  return res.status(201).json({ schedule: result.rows[0] });
});

/** GET /api/classes/:classId/schedules  (owner teacher or enrolled student) */
const listSchedules = asyncHandler(async (req, res) => {
  const access = await resolveAccess(req.params.classId, req.user);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.error });
  }

  const result = await db.query(
    `SELECT * FROM schedules
     WHERE class_id = $1
     ORDER BY start_time ASC`,
    [req.params.classId]
  );
  return res.json({ schedules: result.rows });
});

/** PUT /api/schedules/:id  (TEACHER owner) */
const updateSchedule = asyncHandler(async (req, res) => {
  const existing = await db.query(
    `SELECT s.*, c.teacher_id
     FROM schedules s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Schedule not found.' });
  }
  if (Number(existing.rows[0].teacher_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You do not own this schedule.' });
  }

  const validationError = validateScheduleBody(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { title, startTime, endTime, platform, liveLink } = req.body;
  const result = await db.query(
    `UPDATE schedules
     SET title = $1, start_time = $2, end_time = $3, platform = $4, live_link = $5
     WHERE id = $6
     RETURNING *`,
    [
      String(title).trim(),
      startTime,
      endTime,
      platform,
      String(liveLink).trim(),
      req.params.id,
    ]
  );
  return res.json({ schedule: result.rows[0] });
});

/** DELETE /api/schedules/:id  (TEACHER owner) */
const deleteSchedule = asyncHandler(async (req, res) => {
  const existing = await db.query(
    `SELECT s.id, c.teacher_id
     FROM schedules s
     JOIN classes c ON c.id = s.class_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Schedule not found.' });
  }
  if (Number(existing.rows[0].teacher_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You do not own this schedule.' });
  }

  await db.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
  return res.json({ deleted: true });
});

module.exports = {
  createClass,
  listClasses,
  listStudents,
  enrollStudent,
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  // exported for reuse / testing
  resolveAccess,
  getClassById,
  isClassOwner,
  isEnrolled,
};
