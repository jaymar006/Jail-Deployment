const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const userModel = require('../models/userModel');
const registrationCodeModel = require('../models/registrationCodeModel');
const accountLockoutModel = require('../models/accountLockoutModel');
const { validatePasswordStrength } = require('../middleware/passwordValidator');

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
      await accountLockoutModel.resetFailedAttempts(username);
      
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login successful', token });
    } else {
      // Record failed attempt
      const { failedAttempts, lockedUntil } = await accountLockoutModel.recordFailedAttempts(username, ipAddress);
      
      if (lockedUntil) {
        const lockoutMinutes = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
        return res.status(423).json({ 
          message: `Account locked due to ${failedAttempts} failed login attempts. Please try again in ${lockoutMinutes} minute(s).` 
        });
      }
      
      const remainingAttempts = 5 - failedAttempts;
      res.status(401).json({ 
        message: `Invalid username or password. ${remainingAttempts} attempt(s) remaining before account lockout.` 
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.signUp = async (req, res) => {
  const { username, password, email, confirmEmail, registrationCode } = req.body;

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

    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (email !== confirmEmail) {
      return res.status(400).json({ message: 'Emails do not match' });
    }

    const existingUser = await userModel.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const existingEmail = await userModel.findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await userModel.createUser(username, hashedPassword, email.toLowerCase());
    
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

exports.resetPasswordEmail = async (req, res) => {
  const { username, email, newPassword } = req.body;

  try {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        message: 'New password does not meet security requirements',
        errors: passwordValidation.errors 
      });
    }

    // Verify the user exists
    const user = await userModel.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the email matches
    const isEmailValid = await userModel.verifyEmail(username, email);
    if (!isEmailValid) {
      return res.status(400).json({ message: 'Email does not match the account' });
    }

    // Hash the new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updated = await userModel.updateUserPassword(username, hashedNewPassword);
    
    if (updated) {
      // Reset failed attempts on successful password reset
      await accountLockoutModel.resetFailedAttempts(username);
      res.json({ message: 'Password reset successfully' });
    } else {
      res.status(500).json({ message: 'Failed to update password' });
    }
  } catch (err) {
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