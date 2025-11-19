const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const userModel = require('../models/userModel');
const registrationCodeModel = require('../models/registrationCodeModel');
const accountLockoutModel = require('../models/accountLockoutModel');
const { validatePasswordStrength } = require('../middleware/passwordValidator');
const telegramService = require('../services/telegramService');
const passwordResetModel = require('../models/passwordResetModel');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not found in environment variables');
  console.warn('🔧 Generating a temporary JWT secret...');
  console.warn('💡 For production, please set JWT_SECRET in your .env file');
  
  // Generate a temporary secret (this will change on each restart)
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn('🔐 Temporary JWT secret generated (will change on restart)');
}

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    // Check if account is locked
    const lockedUntil = await accountLockoutModel.isAccountLocked(username);
    if (lockedUntil) {
      const lockoutMinutes = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
      return res.status(423).json({ 
        message: `Account is locked due to too many failed login attempts. Please try again in ${lockoutMinutes} minute(s).` 
      });
    }

    const user = await userModel.findUserByUsername(username);

    if (user && await bcrypt.compare(password, user.password)) {
      // Reset failed attempts on successful login
      try {
        await accountLockoutModel.resetFailedAttempts(username);
      } catch (lockoutError) {
        // Log but don't fail login if lockout reset fails
        console.error('Error resetting failed attempts:', lockoutError.message);
      }
      
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login successful', token });
    } else {
      // Invalid credentials - record failed attempt
      let failedAttempts = 0;
      let lockedUntil = null;
      
      try {
        const result = await accountLockoutModel.recordFailedAttempt(username, ipAddress);
        failedAttempts = result.failedAttempts || 0;
        lockedUntil = result.lockedUntil || null;
      } catch (lockoutError) {
        // Log but continue with error message even if lockout tracking fails
        console.error('Error recording failed attempt:', lockoutError.message);
        // Continue with default values (no lockout tracking)
      }
      
      if (lockedUntil) {
        const lockoutMinutes = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
        return res.status(423).json({ 
          message: `Account locked due to ${failedAttempts} failed login attempts. Please try again in ${lockoutMinutes} minute(s).` 
        });
      }
      
      const remainingAttempts = 5 - failedAttempts;
      res.status(401).json({ 
        message: `Invalid username or password. ${remainingAttempts > 0 ? remainingAttempts + ' attempt(s) remaining before account lockout.' : 'Please try again.'}` 
      });
    }
  } catch (err) {
    // Only return server error for unexpected errors, not authentication failures
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again later.', error: err.message });
  }
};

exports.signUp = async (req, res) => {
  const { username, password, telegramUsername, registrationCode } = req.body;

  try {
    // Validate registration code
    const isValidCode = await registrationCodeModel.isValidRegistrationCode(registrationCode);
    if (!isValidCode) {
      return res.status(403).json({ message: 'Invalid or expired registration code. Please contact an administrator.' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors 
      });
    }

    // Validate username
    if (!username || username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Validate Telegram username
    if (!telegramUsername || !telegramUsername.trim()) {
      return res.status(400).json({ message: 'Telegram username is required for account recovery' });
    }

    // Clean Telegram username (remove @ if present)
    const cleanTelegramUsername = telegramUsername.replace('@', '').trim().toLowerCase();
    
    // Validate Telegram username format (5-32 characters, alphanumeric and underscores)
    if (cleanTelegramUsername.length < 5 || cleanTelegramUsername.length > 32) {
      return res.status(400).json({ message: 'Telegram username must be between 5 and 32 characters' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanTelegramUsername)) {
      return res.status(400).json({ message: 'Telegram username can only contain letters, numbers, and underscores' });
    }

    const existingUser = await userModel.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingTelegramUser = await userModel.findUserByTelegramUsername(cleanTelegramUsername);
    if (existingTelegramUser) {
      return res.status(400).json({ message: 'Telegram username already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with Telegram username
    await userModel.createUser(username, hashedPassword, cleanTelegramUsername);
    
    // Mark registration code as used
    await registrationCodeModel.markCodeAsUsed(registrationCode);
    
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUsernameFromDb = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ usernameFromDb: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Request password reset - sends Telegram message with reset link
exports.requestPasswordReset = async (req, res) => {
  const { usernameOrTelegram } = req.body;

  try {
    if (!usernameOrTelegram) {
      return res.status(400).json({ message: 'Username or Telegram username is required' });
    }

    // Find user by username or Telegram username
    // Try username first
    let user = await userModel.findUserByUsername(usernameOrTelegram);
    
    // If not found, try Telegram username
    if (!user) {
      user = await userModel.findUserByTelegramUsername(usernameOrTelegram);
    }

    // Always return success message (don't reveal if user exists)
    // This prevents user enumeration attacks
    if (!user) {
      return res.json({ 
        message: 'If an account exists with that username or Telegram username, a password reset link has been sent.' 
      });
    }

    // Check if user has Telegram username
    if (!user.telegram_username) {
      return res.status(400).json({ 
        message: 'No Telegram username found for this account. Please contact an administrator.' 
      });
    }

    // Create reset token (using telegram_username instead of email)
    console.log(`📝 Creating password reset token for user: ${user.username} (ID: ${user.id})`);
    let resetToken;
    try {
      resetToken = await passwordResetModel.createResetToken(user.id, user.telegram_username);
      console.log(`✅ Password reset token created successfully: ${resetToken.substring(0, 20)}...`);
    } catch (tokenError) {
      console.error('❌ Failed to create password reset token:', tokenError);
      console.error('   This is a critical error - token was not saved to database!');
      // Still return success to user (security best practice)
      return res.json({ 
        message: 'If an account exists with that username or Telegram username, a password reset link has been sent.' 
      });
    }

    // Send password reset Telegram message (non-blocking - always return success to user)
    // This prevents user enumeration attacks and ensures consistent UX
    (async () => {
      try {
        // Check if Telegram Bot is configured
        if (!process.env.TELEGRAM_BOT_TOKEN) {
          console.error('⚠️  Telegram Bot not configured! Cannot send password reset message.');
          console.error('⚠️  Please set TELEGRAM_BOT_TOKEN environment variable.');
          console.error('⚠️  Get your bot token from: https://t.me/BotFather');
          return;
        }
        
        console.log(`📱 Attempting to send Telegram message to: @${user.telegram_username}`);
        const telegramResult = await telegramService.sendPasswordResetLink(user.telegram_username, user.username, resetToken);
        if (!telegramResult.success) {
          console.error('❌ Failed to send password reset Telegram message:', telegramResult.error);
          console.error('   User:', user.username);
          console.error('   Telegram Username:', user.telegram_username);
          console.error('   Reset token created but Telegram message not sent.');
          console.error('   Token (first 20 chars):', resetToken.substring(0, 20) + '...');
          console.error('');
          console.error('   🔍 TROUBLESHOOTING:');
          console.error('   1. Check if TELEGRAM_BOT_TOKEN is set in environment variables');
          console.error('   2. Verify user @' + user.telegram_username + ' has started your bot');
          console.error('   3. Check if user has blocked the bot');
          console.error('   4. Verify Telegram username is correct:', user.telegram_username);
        } else {
          console.log('✅ Password reset Telegram message sent successfully to:', user.telegram_username);
        }
      } catch (telegramError) {
        console.error('❌ Error sending password reset Telegram message:', telegramError);
        console.error('   Error details:', telegramError.message);
        console.error('   Stack:', telegramError.stack);
        console.error('   Reset token was created but Telegram message failed. Token:', resetToken.substring(0, 20) + '...');
      }
    })(); // Fire and forget - don't wait for Telegram message to send

    // Always return success immediately (security best practice)
    res.json({ 
      message: 'If an account exists with that username or Telegram username, a password reset link has been sent to your Telegram.' 
    });
  } catch (err) {
    console.error('Error requesting password reset:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Reset password with token
exports.resetPasswordWithToken = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors 
      });
    }

    // Verify token
    const tokenData = await passwordResetModel.verifyResetToken(token);
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Get user
    const user = await userModel.findUserById(tokenData.user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updated = await userModel.updateUserPassword(user.username, hashedNewPassword);
    
    if (updated) {
      // Delete the reset token
      await passwordResetModel.deleteResetToken(token);
      
      // Reset failed attempts on successful password reset
      await accountLockoutModel.resetFailedAttempts(user.username);
      
      // Send password reset confirmation Telegram message
      if (user.telegram_username) {
        try {
          await telegramService.sendPasswordResetConfirmation(user.telegram_username, user.username);
        } catch (telegramError) {
          console.error('Error sending password reset confirmation Telegram message:', telegramError);
          // Don't fail the request if Telegram message fails
        }
      }
      
      res.json({ message: 'Password reset successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update password' });
    }
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateUsername = async (req, res) => {
  const { newUsername } = req.body;
  const userId = req.user.id;

  try {
    // Check if the new username already exists
    const existingUser = await userModel.findUserByUsername(newUsername);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Update the username
    const updated = await userModel.updateUsername(userId, newUsername);
    
    if (updated) {
      res.json({ message: 'Username updated successfully', username: newUsername });
    } else {
      res.status(500).json({ message: 'Failed to update username' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors 
      });
    }

    // Change the password
    const result = await userModel.changePassword(userId, currentPassword, newPassword);
    
    if (result.success) {
      res.json({ message: 'Password changed successfully' });
    } else {
      res.status(400).json({ message: result.error || 'Failed to change password' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all registration codes (admin function)
exports.getRegistrationCodes = async (req, res) => {
  try {
    const codes = await registrationCodeModel.getAllRegistrationCodes();
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Create a new registration code (admin function)
exports.createRegistrationCode = async (req, res) => {
  const { code, daysValid } = req.body;

  try {
    let registrationCode = code;
    const days = daysValid ? parseInt(daysValid) : 90;

    // Generate random code if not provided
    if (!registrationCode) {
      registrationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await db.query(
      `INSERT INTO registration_codes (code, expires_at) VALUES (?, ?)`,
      [registrationCode, expiresAt]
    );

    res.json({ 
      message: 'Registration code created successfully',
      code: registrationCode,
      expiresAt: expiresAt.toISOString(),
      daysValid: days
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ message: 'Registration code already exists' });
    } else if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return res.status(500).json({ message: 'Registration codes table does not exist' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};