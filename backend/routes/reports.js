const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateReport } = require('../middleware/validate');
const {
  createReport,
  getReports,
  getReport,
  updateReport,
  deleteReport
} = require('../controllers/reportsController');

// All routes are protected
router.use(protect);

// Reports routes
router.post('/', validateReport, createReport);
router.get('/', getReports);
router.get('/:id', getReport);
router.put('/:id', validateReport, updateReport);
router.delete('/:id', deleteReport);

module.exports = router;
