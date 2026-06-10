'use strict';

const express = require('express');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const {
  updateSchedule,
  deleteSchedule,
} = require('../controllers/classController');

const router = express.Router();

router.use(authenticate);

router.put('/:id', authorize(ROLES.TEACHER), updateSchedule);
router.delete('/:id', authorize(ROLES.TEACHER), deleteSchedule);

module.exports = router;
