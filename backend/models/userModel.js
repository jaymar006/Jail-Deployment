const db = require('../config/db');

const findUserByUsername = async (username) => {
  const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0];
};

const createUser = async (username, password, securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2) => {
  const [result] = await db.query(
    'INSERT INTO users (username, password, security_question_1, security_answer_1, security_question_2, security_answer_2) VALUES (?, ?, ?, ?, ?, ?)', 
    [username, password, securityQuestion1, securityAnswer1, securityQuestion2, securityAnswer2]
  );
  return result.insertId;
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

const verifySecurityAnswer = async (username, securityQuestion, securityAnswer) => {
  const user = await findUserByUsername(username);
  if (!user) return false;

  const matchesQuestion1 = user.security_question_1 === securityQuestion;
  const matchesQuestion2 = user.security_question_2 === securityQuestion;

  let isValid = false;
  if (matchesQuestion1 && user.security_answer_1) {
    isValid = await bcrypt.compare(securityAnswer.toLowerCase(), user.security_answer_1);
  } else if (matchesQuestion2 && user.security_answer_2) {
    isValid = await bcrypt.compare(securityAnswer.toLowerCase(), user.security_answer_2);
  }

  return isValid;
};

module.exports = {
  findUserByUsername,
  createUser,
  findUserById,
  updateUserPassword,
  updateUsername,
  changePassword,
  verifySecurityAnswer,
};
