const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateReport } = require('../middleware/validate');
const {
  createReport,
  getReports,
  getReport,
  updateReport,
  deleteReport,
  validateReport: validateReportFunc,
  getPendingReports,
  getAIAnalysis
} = require('../controllers/reportsController');

// All routes are protected
router.use(protect);

// Reports routes
router.post('/', validateReport, createReport);
router.get('/', getReports);
router.get('/:id', getReport);
router.put('/:id', validateReport, updateReport);
router.delete('/:id', deleteReport);

// AI Analysis route
router.get('/:id/ai-analysis', getAIAnalysis);

// Admin-only routes (protected + admin role required)
router.get('/pending', authorize('govt'), getPendingReports);
router.post('/:id/validate', authorize('govt'), validateReportFunc);

module.exports = router;
