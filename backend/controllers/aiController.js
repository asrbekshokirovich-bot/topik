'use strict';

const db = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { getClient, isConfigured, MODEL } = require('../config/anthropic');

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Pull the concatenated text out of a Messages API response. */
function extractText(message) {
  return (message.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/**
 * Call Claude with a JSON schema constraint and return the parsed object.
 * Structured outputs guarantee the text block is valid JSON for the schema.
 */
async function createJson({ system, prompt, schema, maxTokens = 2048 }) {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema } },
  });
  return JSON.parse(extractText(message));
}

/* ------------------------------------------------------------------ */
/* 1. AI Korean tutor (chat)                                          */
/* ------------------------------------------------------------------ */

const TUTOR_SYSTEM = `You are 선생님 (Seonsaengnim), a warm, encouraging Korean language tutor on the TOPIK Station platform.

Your role:
- Help the student practice Korean for the TOPIK exam through natural conversation.
- Reply primarily in simple Korean appropriate to the student's level, then give a short English gloss in parentheses so they can follow along.
- When the student makes a mistake, gently correct it: show the corrected sentence and briefly explain the grammar or vocabulary point.
- Keep replies concise (a few sentences). Ask a follow-up question to keep the conversation going.
- Be supportive and positive. Never be condescending.
- Stay on the topic of learning Korean. If asked something unrelated, gently steer back.`;

/** POST /api/ai/tutor  { messages: [{role, content}] } */
const tutorChat = asyncHandler(async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  // Sanitize: keep only valid roles/content, cap history length.
  const history = messages
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim()
    )
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return res
      .status(400)
      .json({ error: 'The last message must be from the user.' });
  }

  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: TUTOR_SYSTEM,
    messages: history,
  });

  return res.json({ reply: extractText(message) });
});

/* ------------------------------------------------------------------ */
/* 2. Writing correction                                             */
/* ------------------------------------------------------------------ */

const CORRECTION_SCHEMA = {
  type: 'object',
  properties: {
    corrected: {
      type: 'string',
      description: 'The full text rewritten with all errors fixed.',
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          correction: { type: 'string' },
          explanation: {
            type: 'string',
            description: 'Short explanation in English of the fix.',
          },
        },
        required: ['original', 'correction', 'explanation'],
        additionalProperties: false,
      },
    },
    overall: {
      type: 'string',
      description: 'One or two sentences of encouraging overall feedback.',
    },
  },
  required: ['corrected', 'errors', 'overall'],
  additionalProperties: false,
};

/** POST /api/ai/correct  { text } */
const correctWriting = asyncHandler(async (req, res) => {
  const { text } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'text is required.' });
  }
  if (String(text).length > 4000) {
    return res.status(400).json({ error: 'text is too long (max 4000 chars).' });
  }

  const result = await createJson({
    system:
      'You are a meticulous Korean writing tutor. You correct a student’s Korean writing: fix grammar, spelling, spacing, and word choice, and explain each fix simply in English. Be encouraging.',
    prompt: `Correct the following Korean text written by a TOPIK student. List each individual error with the original fragment, the corrected fragment, and a short English explanation. Then give the fully corrected text and brief overall feedback.\n\nStudent text:\n"""${text}"""`,
    schema: CORRECTION_SCHEMA,
    maxTokens: 2048,
  });

  return res.json({ correction: result });
});

/* ------------------------------------------------------------------ */
/* 3. Quiz generation                                                */
/* ------------------------------------------------------------------ */

const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string', description: 'The Korean word (Hangul).' },
          romanization: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exactly four English-meaning options.',
          },
          answer: {
            type: 'string',
            description: 'The correct option (must equal one of the options).',
          },
          explanation: { type: 'string' },
        },
        required: ['word', 'romanization', 'options', 'answer', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

const VALID_LEVELS = ['TOPIK I', 'TOPIK II', 'Beginner', 'Intermediate', 'Advanced'];

/** POST /api/ai/quiz  { topic?, level? } */
const generateQuiz = asyncHandler(async (req, res) => {
  const { topic, level } = req.body || {};
  const safeTopic =
    topic && String(topic).trim() ? String(topic).trim().slice(0, 100) : 'everyday Korean vocabulary';
  const safeLevel =
    level && VALID_LEVELS.includes(level) ? level : 'TOPIK I (beginner)';

  const result = await createJson({
    system:
      'You are a TOPIK exam content writer. You create accurate, level-appropriate Korean vocabulary multiple-choice questions.',
    prompt: `Create EXACTLY 5 Korean vocabulary multiple-choice questions for the topic "${safeTopic}" at ${safeLevel} level. For each question: give one Korean word in Hangul, its romanization, EXACTLY 4 English-meaning options, the correct answer (which must be exactly equal to one of the 4 options), and a one-sentence explanation. Make the wrong options plausible but clearly incorrect.`,
    schema: QUIZ_SCHEMA,
    maxTokens: 2048,
  });

  // Defensive validation so the frontend always receives clean data.
  const questions = (result.questions || [])
    .filter(
      (q) =>
        q &&
        q.word &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.includes(q.answer)
    )
    .slice(0, 5);

  if (questions.length === 0) {
    return res
      .status(502)
      .json({ error: 'The AI returned no usable questions. Please try again.' });
  }

  return res.json({ questions });
});

/* ------------------------------------------------------------------ */
/* 4. Grading assistant (teacher)                                    */
/* ------------------------------------------------------------------ */

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'integer',
      description: 'Suggested score between 0 and the maximum.',
    },
    feedback: {
      type: 'string',
      description: 'Constructive feedback for the student.',
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'feedback', 'strengths', 'improvements'],
  additionalProperties: false,
};

/** POST /api/ai/grade-suggestion  { submissionId } (TEACHER owner) */
const suggestGrade = asyncHandler(async (req, res) => {
  const { submissionId } = req.body || {};
  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required.' });
  }

  const lookup = await db.query(
    `SELECT s.content, s.link,
            h.title AS homework_title, h.description AS homework_description,
            h.max_score, c.teacher_id
     FROM submissions s
     JOIN homework h ON h.id = s.homework_id
     JOIN classes c ON c.id = h.class_id
     WHERE s.id = $1`,
    [submissionId]
  );
  if (lookup.rowCount === 0) {
    return res.status(404).json({ error: 'Submission not found.' });
  }
  const row = lookup.rows[0];
  if (Number(row.teacher_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You do not own this assignment.' });
  }
  if (!row.content && !row.link) {
    return res
      .status(400)
      .json({ error: 'This submission has no text to evaluate.' });
  }

  const result = await createJson({
    system:
      'You are an experienced TOPIK Korean teacher acting as a grading assistant. You propose a fair score and constructive feedback for a student submission. The teacher reviews and decides — your output is only a suggestion.',
    prompt: `Assignment: "${row.homework_title}"
Instructions: ${row.homework_description || '(none provided)'}
Maximum score: ${row.max_score}

Student submission:
${row.content ? `Text:\n"""${row.content}"""` : ''}
${row.link ? `Link: ${row.link}` : ''}

Suggest an integer score from 0 to ${row.max_score}, written feedback for the student, a few specific strengths, and a few specific areas to improve. Judge the Korean language quality and how well it meets the assignment.`,
    schema: GRADE_SCHEMA,
    maxTokens: 1536,
  });

  // Clamp the suggested score into the valid range.
  let score = Math.round(Number(result.score));
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(row.max_score, score));

  return res.json({
    suggestion: {
      score,
      feedback: result.feedback || '',
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
      maxScore: row.max_score,
    },
  });
});

/* ------------------------------------------------------------------ */
/* Status                                                            */
/* ------------------------------------------------------------------ */

/** GET /api/ai/status — whether AI features are enabled. */
const status = asyncHandler(async (req, res) => {
  res.json({ enabled: isConfigured(), model: isConfigured() ? MODEL : null });
});

module.exports = {
  tutorChat,
  correctWriting,
  generateQuiz,
  suggestGrade,
  status,
};
