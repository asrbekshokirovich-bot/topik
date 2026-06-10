'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');

const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security headers.
app.use(helmet());

// CORS — allow the configured frontend origin.
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// JSON body parsing with a sane limit.
app.use(express.json({ limit: '1mb' }));

// Rate limit the API surface.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', apiLimiter);

// Health check.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'topik-station-api', time: new Date().toISOString() });
});

// Routes.
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler.
app.use((req, res) => {
  res.status(404).json({ error: 'Resource not found.' });
});

// Central error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Postgres error codes:
  //   23505 -> unique_violation  -> 409 Conflict
  //   23503 -> foreign_key_violation -> 400 Bad Request
  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'That record already exists.' });
  }
  if (err && err.code === '23503') {
    return res
      .status(400)
      .json({ error: 'Referenced record does not exist.' });
  }

  // AI features not configured (no ANTHROPIC_API_KEY).
  if (err && err.code === 'AI_NOT_CONFIGURED') {
    return res.status(503).json({ error: err.message });
  }

  // Errors from the Anthropic API (rate limits, auth, overload, etc.).
  if (err instanceof Anthropic.APIError) {
    const aiStatus = typeof err.status === 'number' ? err.status : 502;
    // eslint-disable-next-line no-console
    console.error('Anthropic API error:', err.status, err.message);
    return res.status(aiStatus >= 400 && aiStatus < 600 ? aiStatus : 502).json({
      error: 'The AI service returned an error. Please try again in a moment.',
    });
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error.' });
});

const PORT = Number(process.env.PORT) || 4000;

// Only start listening when run directly (keeps `app` importable for tests).
if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`TOPIK Station API listening on port ${PORT}`);
  });
}

module.exports = app;
