const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate
} = require('../middleware/validate');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile
} = require('../controllers/authController');

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.use(protect); // All routes after this middleware are protected
router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);
router.post('/logout', logout);

module.exports = router;
