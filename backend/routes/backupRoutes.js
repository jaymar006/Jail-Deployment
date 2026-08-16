const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const backupController = require('../controllers/backupController');

router.get('/settings', authMiddleware, backupController.getBackupSettings);
router.post('/settings', authMiddleware, requireAdmin, backupController.updateBackupSettings);
router.post('/', authMiddleware, requireAdmin, backupController.runManualBackup);

module.exports = router;
