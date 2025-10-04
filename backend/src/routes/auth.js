const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { 
  validateRegister, 
  validateLogin,
  validateUserUpdate
} = require('../middleware/validation');

// Public routes
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.get('/me', authController.getProfile);
router.put('/profile', validateUserUpdate, authController.updateProfile);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;