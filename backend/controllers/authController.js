const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userModel = require('../models/userModel');

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

  try {
    const user = await userModel.findUserByUsername(username);

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login successful', token });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.signUp = async (req, res) => {
  const { username, password, securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2 } = req.body;

  try {
    const existingUser = await userModel.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer1 = await bcrypt.hash(securityAnswer1.toLowerCase(), 10);
    const hashedAnswer2 = await bcrypt.hash(securityAnswer2.toLowerCase(), 10);
    
    await userModel.createUser(username, hashedPassword, securityQuestion1, hashedAnswer1, securityQuestion2, hashedAnswer2);
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

exports.resetPasswordSecurity = async (req, res) => {
  const { username, securityQuestion, securityAnswer, newPassword } = req.body;

  try {
    // Verify the user exists
    const user = await userModel.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify the security answer
    const isAnswerCorrect = await userModel.verifySecurityAnswer(username, securityQuestion, securityAnswer);
    if (!isAnswerCorrect) {
      return res.status(400).json({ message: 'Invalid security question or answer' });
    }

    // Hash the new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const updated = await userModel.updateUserPassword(username, hashedNewPassword);
    
    if (updated) {
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

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
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