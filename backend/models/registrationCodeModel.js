const db = require('../config/db');

// Check if a registration code is valid
const isValidRegistrationCode = async (code) => {
  try {
    // First check if registration codes table exists, if not, allow registration (backward compatibility)
    // PostgreSQL uses BOOLEAN (true/false), SQLite uses INTEGER (0/1)
    // Use (is_used = FALSE OR is_used = 0) to work with both, handling NULL as well
    const [rows] = await db.query(
      `SELECT * FROM registration_codes WHERE code = ? AND (is_used = FALSE OR is_used = 0 OR is_used IS NULL) AND (expires_at IS NULL OR expires_at > NOW())`,
      [code]
    );
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
      // PostgreSQL: use TRUE for BOOLEAN
      const [result] = await db.query(
        `UPDATE registration_codes SET is_used = TRUE, used_at = NOW() WHERE code = ?`,
        [code]
      );
      return result.affectedRows > 0;
    } else {
      // SQLite: use 1 for INTEGER
      const [result] = await db.query(
        `UPDATE registration_codes SET is_used = 1, used_at = datetime('now') WHERE code = ?`,
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
const createRegistrationCode = async (code, expiresAt = null) => {
  try {
    const expiresDate = expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const [result] = await db.query(
      `INSERT INTO registration_codes (code, expires_at) VALUES (?, ?)`,
      [code, expiresDate]
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
      `SELECT code, is_used, created_at, expires_at, used_at FROM registration_codes ORDER BY created_at DESC`
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

