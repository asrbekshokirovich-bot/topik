'use strict';

const express = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const {
  submitHomework,
  listSubmissions,
} = require('../controllers/homeworkController');

const router = express.Router();

router.use(authenticate);

// Student submits (create/resubmit) for an assignment.
router.post(
  '/:homeworkId/submissions',
  authorize(ROLES.STUDENT),
  submitHomework
);

// Teacher lists all submissions for an assignment they own.
router.get(
  '/:homeworkId/submissions',
  authorize(ROLES.TEACHER),
  listSubmissions
);

module.exports = router;
