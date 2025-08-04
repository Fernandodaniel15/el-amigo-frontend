const express = require('express');
const CourseController = require('./CourseController');
const router = express.Router();
router.post('/course', CourseController.create);
router.post('/course/join', CourseController.join);
router.get('/courses', CourseController.list);
module.exports = router;
