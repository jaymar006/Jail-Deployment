const db = require('../config/db');

// Check if account is locked
const isAccountLocked = async (username) => {
  try {
    // Check if using PostgreSQL or SQLite
    const usePostgres = !!process.env.DATABASE_URL;
    let query;
    
    if (usePostgres) {
      query = `SELECT locked_until FROM account_lockouts WHERE username = ? AND locked_until > NOW()`;
    } else {
      query = `SELECT locked_until FROM account_lockouts WHERE username = ? AND locked_until > datetime('now')`;
    }
    
    const [rows] = await db.query(query, [username]);
    return rows.length > 0 ? rows[0].locked_until : null;
  } catch (err) {
    // If table doesn't exist, return null (no lockout)
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return null;
    }
    throw err;
  }
};

// Record a failed login attempt
const recordFailedAttempt = async (username, ipAddress) => {
  try {
    // Get current failed attempts
    const [existing] = await db.query(
      `SELECT failed_attempts, last_attempt FROM account_lockouts WHERE username = ?`,
      [username]
    );
    
    const failedAttempts = existing.length > 0 ? existing[0].failed_attempts + 1 : 1;
    const maxAttempts = 5;
    const lockoutDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    let lockedUntil = null;
    if (failedAttempts >= maxAttempts) {
      lockedUntil = new Date(Date.now() + lockoutDuration);
    }
    
    // Check if using PostgreSQL or SQLite
    const usePostgres = !!process.env.DATABASE_URL;
    
    if (existing.length > 0) {
      // Update existing record
      let query;
      if (usePostgres) {
        query = `UPDATE account_lockouts SET failed_attempts = ?, last_attempt = NOW(), locked_until = ?, ip_address = ? WHERE username = ?`;
      } else {
        query = `UPDATE account_lockouts SET failed_attempts = ?, last_attempt = datetime('now'), locked_until = ?, ip_address = ? WHERE username = ?`;
      }
      await db.query(query, [failedAttempts, lockedUntil, ipAddress, username]);
    } else {
      // Create new record
      let query;
      if (usePostgres) {
        query = `INSERT INTO account_lockouts (username, failed_attempts, last_attempt, locked_until, ip_address) VALUES (?, ?, NOW(), ?, ?)`;
      } else {
        query = `INSERT INTO account_lockouts (username, failed_attempts, last_attempt, locked_until, ip_address) VALUES (?, ?, datetime('now'), ?, ?)`;
      }
      await db.query(query, [username, failedAttempts, lockedUntil, ipAddress]);
    }
    
    return { failedAttempts, lockedUntil };
  } catch (err) {
    // If table doesn't exist, just return (no lockout tracking)
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return { failedAttempts: 0, lockedUntil: null };
    }
    throw err;
  }
};

// Reset failed attempts on successful login
const resetFailedAttempts = async (username) => {
  try {
    await db.query(
      `UPDATE account_lockouts SET failed_attempts = 0, locked_until = NULL WHERE username = ?`,
      [username]
    );
  } catch (err) {
    // If table doesn't exist, ignore
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      return;
    }
    throw err;
  }
};

module.exports = {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
};

