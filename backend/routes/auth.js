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
  getMapData,
  sendNotification,
  getUserNotifications,
  getLeaderboard,
  getUserGamification,
  redeemReward
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

// Notification routes (admin only)
router.post('/notifications/send', authorize('govt'), sendNotification);
router.get('/notifications/:userId', authorize('govt'), getUserNotifications);

// Gamification routes (all authenticated users)
router.get('/gamification/leaderboard', getLeaderboard);
router.get('/gamification/user/:id', getUserGamification);
router.post('/gamification/rewards/redeem', redeemReward);

module.exports = router;
