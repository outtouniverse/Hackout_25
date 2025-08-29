const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validatePasswordUpdate 
} = require('../middleware/validate');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/authController');

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.use(protect); // All routes after this middleware are protected
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', validatePasswordUpdate, updatePassword);
router.post('/logout', logout);

module.exports = router;
