'use strict';

const express = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const {
  createClass,
  listClasses,
  listStudents,
  enrollStudent,
  createSchedule,
  listSchedules,
} = require('../controllers/classController');
const {
  createHomework,
  listHomework,
} = require('../controllers/homeworkController');

const router = express.Router();

// Every class route requires authentication.
router.use(authenticate);

// Classes
router.post('/', authorize(ROLES.TEACHER), createClass);
router.get('/', listClasses);

// Students & enrollments (teacher owner)
router.get('/:classId/students', authorize(ROLES.TEACHER), listStudents);
router.post('/:classId/enrollments', authorize(ROLES.TEACHER), enrollStudent);

// Nested schedules
router.post('/:classId/schedules', authorize(ROLES.TEACHER), createSchedule);
router.get('/:classId/schedules', listSchedules);

// Nested homework
router.post('/:classId/homework', authorize(ROLES.TEACHER), createHomework);
router.get('/:classId/homework', listHomework);

module.exports = router;
