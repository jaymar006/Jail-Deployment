const db = require('../config/db');
const crypto = require('crypto');

// Hash a reset token so raw tokens are never stored at rest.
// Only the SHA-256 digest is persisted; the raw token is returned once
// to send via Telegram and cannot be recovered from the database.
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Create a password reset token
const createResetToken = async (userId, telegramUsername) => {
  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresDate = new Date(Date.now() + 3600000); // 1 hour from now
  // SQLite stores TEXT; use the same 'YYYY-MM-DD HH:MM:SS' format as datetime('now')
  // so the verify query (expires_at > datetime('now')) compares correctly.
  const expiresAtSqlite = expiresDate.toISOString().slice(0, 19).replace('T', ' ');
  
  try {
    // Check if using PostgreSQL or SQLite
    const usePostgres = !!process.env.DATABASE_URL;
    const tokenHash = hashToken(token);
    
    if (usePostgres) {
      // PostgreSQL: Use ? placeholders - db.postgres.js will convert to $1, $2, etc.
      // Use ON CONFLICT for PostgreSQL. Pass the Date object - pg serializes it correctly as TIMESTAMP.
      const result = await db.query(
        `INSERT INTO password_reset_tokens (user_id, telegram_username, token, expires_at) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT (user_id) DO UPDATE SET token = ?, expires_at = ?, created_at = CURRENT_TIMESTAMP`,
        [userId, telegramUsername, tokenHash, expiresDate, tokenHash, expiresDate]
      );
    } else {
      // SQLite: Delete existing token first, then insert
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, telegram_username, token, expires_at) VALUES (?, ?, ?, ?)`,
        [userId, telegramUsername, tokenHash, expiresAtSqlite]
      );
    }
    
    return token;
  } catch (err) {
    console.error('❌ Error creating reset token:', err);
    console.error('   Error message:', err.message);
    console.error('   Error code:', err.code);
    console.error('   Error detail:', err.detail);
    console.error('   Error stack:', err.stack);
    throw err;
  }
};

// Verify and get token info
const verifyResetToken = async (token) => {
  try {
    const usePostgres = !!process.env.DATABASE_URL;
    const tokenHash = hashToken(token);
    let query;
    
    if (usePostgres) {
      // Use ? placeholder - db.postgres.js will convert to $1
      query = `SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()`;
    } else {
      query = `SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')`;
    }
    
    const [rows] = await db.query(query, [tokenHash]);
    return rows[0] || null;
  } catch (err) {
    console.error('Error verifying reset token:', err);
    return null;
  }
};

// Delete a reset token (after successful password reset)
const deleteResetToken = async (token) => {
  try {
    const tokenHash = hashToken(token);
    await db.query('DELETE FROM password_reset_tokens WHERE token = ?', [tokenHash]);
    return true;
  } catch (err) {
    console.error('Error deleting reset token:', err);
    return false;
  }
};

// Clean up expired tokens
const cleanupExpiredTokens = async () => {
  try {
    const usePostgres = !!process.env.DATABASE_URL;
    let query;
    
    if (usePostgres) {
      query = `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`;
    } else {
      query = `DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`;
    }
    
    await db.query(query);
  } catch (err) {
    // Table might not exist yet, ignore error
    if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== '42P01') {
      console.error('Error cleaning up expired tokens:', err);
    }
  }
};

module.exports = {
  createResetToken,
  verifyResetToken,
  deleteResetToken,
  cleanupExpiredTokens,
};

