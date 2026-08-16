const express = require('express');
const router = express.Router();
const { login, signUp, getProfile, requestPasswordReset, resetPasswordWithToken, updateUsername, changePassword, updateTelegramUsername, getRegistrationCodes, createRegistrationCode } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');
const { loginLimiter, signupLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/signup', signupLimiter, signUp);
router.post('/request-password-reset', passwordResetLimiter, requestPasswordReset);
router.post('/reset-password', passwordResetLimiter, resetPasswordWithToken);
router.get('/me', authMiddleware, getProfile);
router.put('/username', authMiddleware, updateUsername);
router.put('/password', authMiddleware, changePassword);
router.put('/telegram-username', authMiddleware, updateTelegramUsername);
router.get('/registration-codes', authMiddleware, requireAdmin, getRegistrationCodes);
router.post('/registration-codes', authMiddleware, requireAdmin, createRegistrationCode);

module.exports = router;
