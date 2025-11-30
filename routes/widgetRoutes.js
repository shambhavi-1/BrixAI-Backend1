const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widgetController');

// Widget API routes
router.get('/projects', widgetController.getProjects);
router.get('/activity', widgetController.getRecentActivity);
router.post('/tasks', widgetController.createTask);
router.post('/daylogs', widgetController.createDayLog);
router.post('/issues', widgetController.createIssue);
router.post('/attendance', widgetController.markAttendance);

module.exports = router;
