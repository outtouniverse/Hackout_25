const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate,
  validateBanUser
} = require('../middleware/validate');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  getAllUsers,
  banUser,
  getSystemStats,
  getMapData
} = require('../controllers/authController');

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.use(protect); // All routes after this middleware are protected
router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);
router.post('/logout', logout);

// Admin routes (protected + admin role required)
router.get('/admin/users', authorize('govt'), getAllUsers);
router.put('/admin/users/:id/ban', authorize('govt'), validateBanUser, banUser);
router.get('/admin/stats', authorize('govt'), getSystemStats);
router.get('/admin/map', authorize('govt'), getMapData);

module.exports = router;
