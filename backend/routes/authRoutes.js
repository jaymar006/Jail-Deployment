const express = require('express');
const router = express.Router();
const { login, signUp, getProfile, resetPasswordSecurity, updateUsername, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter, signupLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/signup', signupLimiter, signUp);
router.post('/reset-password-security', passwordResetLimiter, resetPasswordSecurity);
router.get('/me', authMiddleware, getProfile);
router.put('/username', authMiddleware, updateUsername);
router.put('/password', authMiddleware, changePassword);

module.exports = router;
