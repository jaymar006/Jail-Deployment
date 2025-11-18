const db = require('../config/db');

// Check if account is locked
const isAccountLocked = async (username) => {
  try {
    const [rows] = await db.query(
      `SELECT locked_until FROM account_lockouts WHERE username = ? AND locked_until > NOW()`,
      [username]
    );
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
    
    if (existing.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE account_lockouts SET failed_attempts = ?, last_attempt = NOW(), locked_until = ?, ip_address = ? WHERE username = ?`,
        [failedAttempts, lockedUntil, ipAddress, username]
      );
    } else {
      // Create new record
      await db.query(
        `INSERT INTO account_lockouts (username, failed_attempts, last_attempt, locked_until, ip_address) VALUES (?, ?, NOW(), ?, ?)`,
        [username, failedAttempts, lockedUntil, ipAddress]
      );
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

