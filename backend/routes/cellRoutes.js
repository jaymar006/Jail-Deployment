const express = require('express');
const router = express.Router();
const cellController = require('../controllers/cellController');
const authMiddleware = require('../middleware/authMiddleware');

// Debug middleware to log requests
router.use((req, res, next) => {
  console.log(`Cell route accessed: ${req.method} ${req.path}`);
  next();
});

// Apply authentication middleware to all routes
// router.use(authMiddleware); // Temporarily commented out for testing

// GET all cells
router.get('/', cellController.getAllCells);

// GET active cells only
router.get('/active', cellController.getActiveCells);

// GET single cell by ID
router.get('/:id', cellController.getCellById);

// POST new cell
router.post('/', cellController.addCell);

// PUT update cell
router.put('/:id', cellController.updateCell);

// DELETE cell
router.delete('/:id', cellController.deleteCell);

module.exports = router;
