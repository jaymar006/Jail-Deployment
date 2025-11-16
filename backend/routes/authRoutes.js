const express = require('express');
const router = express.Router();
const { login, signUp, getProfile, resetPasswordSecurity, updateUsername, changePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/signup', signUp);
router.post('/reset-password-security', resetPasswordSecurity);
router.get('/me', authMiddleware, getProfile);
router.put('/username', authMiddleware, updateUsername);
router.put('/password', authMiddleware, changePassword);

module.exports = router;
