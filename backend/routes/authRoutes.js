const express = require('express');
const router = express.Router();
const { login, signUp, getProfile, resetPasswordEmail, updateUsername, changePassword, getRegistrationCodes, createRegistrationCode } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter, signupLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/signup', signupLimiter, signUp);
router.post('/reset-password-email', passwordResetLimiter, resetPasswordEmail);
router.get('/me', authMiddleware, getProfile);
router.put('/username', authMiddleware, updateUsername);
router.put('/password', authMiddleware, changePassword);
router.get('/registration-codes', authMiddleware, getRegistrationCodes);
router.post('/registration-codes', authMiddleware, createRegistrationCode);

module.exports = router;
