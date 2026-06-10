'use strict';

const express = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const {
  tutorChat,
  correctWriting,
  generateQuiz,
  suggestGrade,
  status,
} = require('../controllers/aiController');

const router = express.Router();

router.use(authenticate);

// Available to any authenticated user.
router.get('/status', status);
router.post('/tutor', tutorChat);
router.post('/correct', correctWriting);
router.post('/quiz', generateQuiz);

// Teacher-only grading assistant.
router.post('/grade-suggestion', authorize(ROLES.TEACHER), suggestGrade);

module.exports = router;
