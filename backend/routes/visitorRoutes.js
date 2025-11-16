const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');

// Get all visitors for a specific PDL
router.get('/pdls/:pdlId/visitors', visitorController.getVisitorsByPdl);

// Get all visitors with PDL names
router.get('/visitors', visitorController.getAllVisitorsWithPdlNames);

// Get a specific visitor by ID
router.get('/visitors/:id', visitorController.getVisitorById);

// Add a visitor with validation (max 5 visitors per PDL)
router.post('/pdls/:pdlId/visitors', visitorController.addVisitor);

// Update a visitor
router.put('/visitors/:id', visitorController.updateVisitor);

// Delete a visitor
router.delete('/visitors/:id', visitorController.deleteVisitor);

// Record scan (time in/time out)
router.post('/visitors/scan', visitorController.recordScan);

// New routes for scanned visitors
router.get('/scanned_visitors', visitorController.getScannedVisitors);
router.post('/scanned_visitors', visitorController.addScannedVisitor);

router.put('/scanned_visitors/:id', require('../controllers/visitorController').updateScannedVisitorTimes);

router.delete('/scanned_visitors/:id', require('../controllers/visitorController').deleteScannedVisitor);

// Delete logs routes
router.delete('/logs/all', require('../controllers/visitorController').deleteAllLogs);
router.delete('/logs/date-range', require('../controllers/visitorController').deleteLogsByDateRange);
router.delete('/logs/date', require('../controllers/visitorController').deleteLogsByDate);

module.exports = router;
