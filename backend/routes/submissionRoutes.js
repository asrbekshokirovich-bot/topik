'use strict';

const express = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const {
  mySubmissions,
  gradeSubmission,
} = require('../controllers/homeworkController');

const router = express.Router();

router.use(authenticate);

// Declared before any `/:id` route so it is never shadowed.
router.get('/mine', authorize(ROLES.STUDENT), mySubmissions);

// Teacher grades a single submission.
router.put('/:id/grade', authorize(ROLES.TEACHER), gradeSubmission);

module.exports = router;
