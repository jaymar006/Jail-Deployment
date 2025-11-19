const db = require('../config/db');
const crypto = require('crypto');

// Create a password reset token
const createResetToken = async (userId, telegramUsername) => {
  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
  
  try {
    console.log(`🔑 Creating password reset token for user_id: ${userId}, telegram_username: ${telegramUsername}`);
    console.log(`   Token (first 20 chars): ${token.substring(0, 20)}...`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    
    // Check if using PostgreSQL or SQLite
    const usePostgres = !!process.env.DATABASE_URL;
    
    if (usePostgres) {
      // PostgreSQL: Use ? placeholders - db.postgres.js will convert to $1, $2, etc.
      // Use ON CONFLICT for PostgreSQL
      console.log('   Using PostgreSQL database');
      const result = await db.query(
        `INSERT INTO password_reset_tokens (user_id, telegram_username, token, expires_at) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT (user_id) DO UPDATE SET token = ?, expires_at = ?, created_at = NOW()`,
        [userId, telegramUsername, token, expiresAt, token, expiresAt]
      );
      console.log(`✅ Password reset token saved to database successfully`);
      console.log(`   Result:`, result);
    } else {
      // SQLite: Delete existing token first, then insert
      console.log('   Using SQLite database');
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
      const result = await db.query(
        `INSERT INTO password_reset_tokens (user_id, telegram_username, token, expires_at) VALUES (?, ?, ?, ?)`,
        [userId, telegramUsername, token, expiresAt]
      );
      console.log(`✅ Password reset token saved to database successfully`);
      console.log(`   Result:`, result);
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
    let query;
    
    if (usePostgres) {
      // Use ? placeholder - db.postgres.js will convert to $1
      query = `SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()`;
    } else {
      query = `SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > datetime('now')`;
    }
    
    const [rows] = await db.query(query, [token]);
    return rows[0] || null;
  } catch (err) {
    console.error('Error verifying reset token:', err);
    return null;
  }
};

// Delete a reset token (after successful password reset)
const deleteResetToken = async (token) => {
  try {
    await db.query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
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

