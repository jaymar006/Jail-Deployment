const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const scheduleController = require('../controllers/scheduleController');

// Shared schedule is protected (must be logged in)
router.use(authMiddleware);

// Get global weekly schedule
router.get('/weekly-cells', scheduleController.getWeeklyCellSchedule);

// Replace global weekly schedule (full object)
router.put('/weekly-cells', scheduleController.replaceWeeklyCellSchedule);

module.exports = router;

