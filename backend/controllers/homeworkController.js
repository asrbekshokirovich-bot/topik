'use strict';

const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../middleware/auth');
const {
  getClassById,
  isClassOwner,
  isEnrolled,
  resolveAccess,
} = require('./classController');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Fetch homework joined with its class teacher_id, or null. */
async function getHomeworkWithOwner(homeworkId) {
  const result = await db.query(
    `SELECT h.*, c.teacher_id, c.title AS class_title
     FROM homework h
     JOIN classes c ON c.id = h.class_id
     WHERE h.id = $1`,
    [homeworkId]
  );
  return result.rows[0] || null;
}

/* ------------------------------------------------------------------ */
/* Homework                                                           */
/* ------------------------------------------------------------------ */

/** POST /api/classes/:classId/homework  (TEACHER owner) */
const createHomework = asyncHandler(async (req, res) => {
  const klass = await getClassById(req.params.classId);
  if (!klass) return res.status(404).json({ error: 'Class not found.' });
  if (!isClassOwner(klass, req.user.id)) {
    return res.status(403).json({ error: 'You do not own this class.' });
  }

  const { title, description, dueDate, maxScore } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Homework title is required.' });
  }
  const max = maxScore === undefined || maxScore === null ? 100 : Number(maxScore);
  if (!Number.isInteger(max) || max < 1 || max > 100) {
    return res
      .status(400)
      .json({ error: 'maxScore must be an integer between 1 and 100.' });
  }

  const result = await db.query(
    `INSERT INTO homework (class_id, title, description, due_date, max_score)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      req.params.classId,
      String(title).trim(),
      description ? String(description) : null,
      dueDate || null,
      max,
    ]
  );
  return res.status(201).json({ homework: result.rows[0] });
});

/** GET /api/classes/:classId/homework  (owner teacher or enrolled student) */
const listHomework = asyncHandler(async (req, res) => {
  const access = await resolveAccess(req.params.classId, req.user);
  if (!access.ok) {
    return res.status(access.status).json({ error: access.error });
  }

  if (req.user.role === ROLES.TEACHER) {
    const result = await db.query(
      `SELECT h.*,
              COUNT(s.id)::int AS submission_count,
              COUNT(s.score)::int AS graded_count
       FROM homework h
       LEFT JOIN submissions s ON s.homework_id = h.id
       WHERE h.class_id = $1
       GROUP BY h.id
       ORDER BY h.created_at DESC`,
      [req.params.classId]
    );
    return res.json({ homework: result.rows });
  }

  // STUDENT: include their own submission (if any) via LEFT JOIN.
  const result = await db.query(
    `SELECT h.*,
            s.id        AS submission_id,
            s.content   AS submission_content,
            s.link      AS submission_link,
            s.score     AS submission_score,
            s.feedback  AS submission_feedback,
            s.submitted_at AS submission_submitted_at,
            s.graded_at AS submission_graded_at
     FROM homework h
     LEFT JOIN submissions s
       ON s.homework_id = h.id AND s.student_id = $2
     WHERE h.class_id = $1
     ORDER BY h.created_at DESC`,
    [req.params.classId, req.user.id]
  );
  return res.json({ homework: result.rows });
});

/* ------------------------------------------------------------------ */
/* Submissions                                                        */
/* ------------------------------------------------------------------ */

/** POST /api/homework/:homeworkId/submissions  (STUDENT) */
const submitHomework = asyncHandler(async (req, res) => {
  const homework = await getHomeworkWithOwner(req.params.homeworkId);
  if (!homework) {
    return res.status(404).json({ error: 'Homework not found.' });
  }
  if (!(await isEnrolled(homework.class_id, req.user.id))) {
    return res
      .status(403)
      .json({ error: 'You are not enrolled in this class.' });
  }

  const { content, link } = req.body || {};
  const hasContent = content && String(content).trim();
  const hasLink = link && String(link).trim();
  if (!hasContent && !hasLink) {
    return res
      .status(400)
      .json({ error: 'Provide submission text and/or a link.' });
  }

  // One submission per student per assignment. Resubmitting clears the grade.
  const result = await db.query(
    `INSERT INTO submissions (homework_id, student_id, content, link)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (homework_id, student_id) DO UPDATE
       SET content = EXCLUDED.content,
           link = EXCLUDED.link,
           submitted_at = NOW(),
           score = NULL,
           feedback = NULL,
           graded_at = NULL
     RETURNING *`,
    [
      req.params.homeworkId,
      req.user.id,
      hasContent ? String(content) : null,
      hasLink ? String(link).trim() : null,
    ]
  );
  return res.status(201).json({ submission: result.rows[0] });
});

/** GET /api/homework/:homeworkId/submissions  (TEACHER owner) */
const listSubmissions = asyncHandler(async (req, res) => {
  const homework = await getHomeworkWithOwner(req.params.homeworkId);
  if (!homework) {
    return res.status(404).json({ error: 'Homework not found.' });
  }
  if (Number(homework.teacher_id) !== Number(req.user.id)) {
    return res
      .status(403)
      .json({ error: 'You do not own this assignment.' });
  }

  const result = await db.query(
    `SELECT s.*,
            u.full_name AS student_name,
            u.email     AS student_email
     FROM submissions s
     JOIN users u ON u.id = s.student_id
     WHERE s.homework_id = $1
     ORDER BY s.submitted_at DESC`,
    [req.params.homeworkId]
  );
  return res.json({
    submissions: result.rows,
    maxScore: homework.max_score,
  });
});

/** PUT /api/submissions/:id/grade  (TEACHER owner) */
const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await db.query(
    `SELECT s.*, h.max_score, c.teacher_id
     FROM submissions s
     JOIN homework h ON h.id = s.homework_id
     JOIN classes c ON c.id = h.class_id
     WHERE s.id = $1`,
    [req.params.id]
  );
  if (submission.rowCount === 0) {
    return res.status(404).json({ error: 'Submission not found.' });
  }
  const row = submission.rows[0];
  if (Number(row.teacher_id) !== Number(req.user.id)) {
    return res
      .status(403)
      .json({ error: 'You do not own this assignment.' });
  }

  const { score, feedback } = req.body || {};
  const numericScore = Number(score);
  if (
    score === undefined ||
    score === null ||
    !Number.isFinite(numericScore) ||
    numericScore < 0 ||
    numericScore > 100
  ) {
    return res
      .status(400)
      .json({ error: 'score must be a number between 0 and 100.' });
  }
  if (numericScore > row.max_score) {
    return res.status(400).json({
      error: `score must not exceed the maximum of ${row.max_score}.`,
    });
  }

  const result = await db.query(
    `UPDATE submissions
     SET score = $1, feedback = $2, graded_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [numericScore, feedback ? String(feedback) : null, req.params.id]
  );
  return res.json({ submission: result.rows[0] });
});

/** GET /api/submissions/mine  (STUDENT) — grades across all classes */
const mySubmissions = asyncHandler(async (req, res) => {
  const result = await db.query(
    `SELECT s.id,
            s.score,
            s.feedback,
            s.content,
            s.link,
            s.submitted_at,
            s.graded_at,
            h.id    AS homework_id,
            h.title AS homework_title,
            h.max_score,
            c.title AS class_title
     FROM submissions s
     JOIN homework h ON h.id = s.homework_id
     JOIN classes c ON c.id = h.class_id
     WHERE s.student_id = $1
     ORDER BY s.submitted_at DESC`,
    [req.user.id]
  );
  return res.json({ submissions: result.rows });
});

module.exports = {
  createHomework,
  listHomework,
  submitHomework,
  listSubmissions,
  gradeSubmission,
  mySubmissions,
};
