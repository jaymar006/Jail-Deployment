const db = require('../config/db');

const findUserByUsername = async (username) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
};

const createUser = async (username, password, telegramUsername) => {
  const [result] = await db.query(
    'INSERT INTO users (username, password, telegram_username) VALUES (?, ?, ?)', 
    [username, password, telegramUsername]
  );
  return result.insertId;
};

const findUserByEmail = async (email) => {
  // Normalize email to lowercase for case-insensitive lookup
  // This ensures consistency since emails are stored in lowercase during signup
  const normalizedEmail = email.toLowerCase().trim();
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
  return rows[0];
};

const findUserById = async (id) => {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
};

const updateUserPassword = async (username, newPassword) => {
  const [result] = await db.query('UPDATE users SET password = ? WHERE username = ?', [newPassword, username]);
  return result.affectedRows > 0;
};

const updateUsername = async (userId, newUsername) => {
  const [result] = await db.query('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);
  return result.affectedRows > 0;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  // First verify the current password
  const user = await findUserById(userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  const bcrypt = require('bcrypt');
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return { success: false, error: 'Current password is incorrect' };
  }
  
  // Hash the new password and update
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  const [result] = await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);
  
  return { success: result.affectedRows > 0 };
};

const bcrypt = require('bcrypt');

// Find user by Telegram username
const findUserByTelegramUsername = async (telegramUsername) => {
  // Remove @ if present and normalize
  const cleanTelegramUsername = telegramUsername.replace('@', '').trim().toLowerCase();
  const [rows] = await db.query('SELECT * FROM users WHERE LOWER(telegram_username) = ?', [cleanTelegramUsername]);
  return rows[0];
};

// Verify email for password reset
const verifyEmail = async (username, email) => {
  const user = await findUserByUsername(username);
  if (!user) return false;
  
  // Compare emails case-insensitively
  return user.email && user.email.toLowerCase() === email.toLowerCase();
};

module.exports = {
  findUserByUsername,
  findUserByEmail,
  findUserByTelegramUsername,
  createUser,
  findUserById,
  updateUserPassword,
  updateUsername,
  changePassword,
  verifyEmail,
};
