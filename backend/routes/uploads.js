const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateUpload } = require('../middleware/validate');

const {
  uploadImage,
  getUserUploads,
  getUpload,
  getAIAnalysis,
  getUploadLeaderboard,
  getAllUploads,
  reviewUpload
} = require('../controllers/uploadController'); 


// Public routes (if any)
router.get('/leaderboard', getUploadLeaderboard);

// Protected routes
router.use(protect);

// User upload routes
router.post('/', validateUpload, uploadImage);
router.get('/', getUserUploads);
router.get('/:id', getUpload);
router.get('/:id/ai-analysis', getAIAnalysis);

// Admin routes
router.get('/admin/all', authorize('govt'), getAllUploads);
router.put('/:id/review', authorize('govt'), reviewUpload);

module.exports = router;
