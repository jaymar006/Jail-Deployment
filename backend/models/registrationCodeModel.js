const db = require('../config/db');

// Check if a registration code is valid
const isValidRegistrationCode = async (code) => {
  try {
    // Check if using PostgreSQL (has DATABASE_URL) or SQLite
    const usePostgres = !!process.env.DATABASE_URL;
    
    let query;
    if (usePostgres) {
      // PostgreSQL: Check if code exists, not expired, and hasn't reached usage limit
      // Use ? placeholder - db.postgres.js will convert it to $1
      query = `SELECT * FROM registration_codes 
               WHERE code = ? 
               AND (expires_at IS NULL OR expires_at > NOW())
               AND (used_count IS NULL OR used_count < COALESCE(use_limit, 1))`;
    } else {
      // SQLite: Check if code exists, not expired, and hasn't reached usage limit
      query = `SELECT * FROM registration_codes 
               WHERE code = ? 
               AND (expires_at IS NULL OR expires_at > datetime('now'))
               AND (used_count IS NULL OR used_count < COALESCE(use_limit, 1))`;
    }
    
    const [rows] = await db.query(query, [code]);
    return rows.length > 0;
  } catch (err) {
    // If table doesn't exist, return true for backward compatibility
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return true; // Allow registration if table doesn't exist
    }
    throw err;
  }
};

// Mark a registration code as used
const markCodeAsUsed = async (code) => {
  try {
    // Check if using PostgreSQL (has DATABASE_URL) or SQLite
    const usePostgres = !!process.env.DATABASE_URL;
    
    if (usePostgres) {
      // PostgreSQL: Increment used_count and set is_used if limit reached
      const [result] = await db.query(
        `UPDATE registration_codes 
         SET used_count = COALESCE(used_count, 0) + 1,
             is_used = (COALESCE(used_count, 0) + 1 >= COALESCE(use_limit, 1)),
             used_at = CASE 
               WHEN used_at IS NULL THEN NOW() 
               ELSE used_at 
             END
         WHERE code = ?`,
        [code]
      );
      return result.affectedRows > 0;
    } else {
      // SQLite: Increment used_count and set is_used if limit reached
      const [result] = await db.query(
        `UPDATE registration_codes 
         SET used_count = COALESCE(used_count, 0) + 1,
             is_used = CASE 
               WHEN (COALESCE(used_count, 0) + 1 >= COALESCE(use_limit, 1)) THEN 1 
               ELSE is_used 
             END,
             used_at = CASE 
               WHEN used_at IS NULL THEN datetime('now') 
               ELSE used_at 
             END
         WHERE code = ?`,
        [code]
      );
      return result.affectedRows > 0;
    }
  } catch (err) {
    // If table doesn't exist, just return true
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return true;
    }
    throw err;
  }
};

// Create a new registration code (admin function)
const createRegistrationCode = async (code, expiresAt = null, useLimit = 1) => {
  try {
    const expiresDate = expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const [result] = await db.query(
      `INSERT INTO registration_codes (code, expires_at, use_limit, used_count) VALUES (?, ?, ?, 0)`,
      [code, expiresDate, useLimit]
    );
    return result.insertId;
  } catch (err) {
    throw err;
  }
};

// Get all registration codes (admin function)
const getAllRegistrationCodes = async () => {
  try {
    const [rows] = await db.query(
      `SELECT code, is_used, use_limit, used_count, created_at, expires_at, used_at FROM registration_codes ORDER BY created_at DESC`
    );
    return rows;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return [];
    }
    throw err;
  }
};

module.exports = {
  isValidRegistrationCode,
  markCodeAsUsed,
  createRegistrationCode,
  getAllRegistrationCodes,
};

