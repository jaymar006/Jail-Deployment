const express = require('express');
const router = express.Router();
const { login, signUp, getProfile, requestPasswordReset, resetPasswordWithToken, updateUsername, changePassword, getRegistrationCodes, createRegistrationCode } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { loginLimiter, signupLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/signup', signupLimiter, signUp);
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPasswordWithToken);
router.get('/me', authMiddleware, getProfile);
router.put('/username', authMiddleware, updateUsername);
router.put('/password', authMiddleware, changePassword);
router.get('/registration-codes', authMiddleware, getRegistrationCodes);
router.post('/registration-codes', authMiddleware, createRegistrationCode);

module.exports = router;
