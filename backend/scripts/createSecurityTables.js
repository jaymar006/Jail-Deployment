const db = require('../config/db');

const createSecurityTables = async () => {
  try {
    // Create registration_codes table
    const registrationCodesQuery = `
      CREATE TABLE IF NOT EXISTS registration_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(255) NOT NULL UNIQUE,
        is_used BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        used_at TIMESTAMP NULL,
        INDEX idx_code (code),
        INDEX idx_is_used (is_used)
      )
    `;
    
    await db.query(registrationCodesQuery);
    console.log('✅ registration_codes table created or already exists');
    
    // Create account_lockouts table
    const accountLockoutsQuery = `
      CREATE TABLE IF NOT EXISTS account_lockouts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        failed_attempts INT DEFAULT 0,
        last_attempt TIMESTAMP NULL,
        locked_until TIMESTAMP NULL,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_locked_until (locked_until)
      )
    `;
    
    await db.query(accountLockoutsQuery);
    console.log('✅ account_lockouts table created or already exists');
    
    // Create a default registration code if REGISTRATION_CODE env var is set
    const defaultCode = process.env.REGISTRATION_CODE;
    if (defaultCode) {
      try {
        const [existing] = await db.query(
          'SELECT * FROM registration_codes WHERE code = ?',
          [defaultCode]
        );
        
        if (existing.length === 0) {
          // Calculate expiration date (1 year from now)
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          
          // Check if using PostgreSQL or SQLite
          const usePostgres = !!process.env.DATABASE_URL;
          if (usePostgres) {
            await db.query(
              'INSERT INTO registration_codes (code, expires_at, use_limit, used_count) VALUES (?, ?, 1, 0)',
              [defaultCode, expiresAt]
            );
          } else {
            await db.query(
              'INSERT INTO registration_codes (code, expires_at, use_limit, used_count) VALUES (?, ?, 1, 0)',
              [defaultCode, expiresAt]
            );
          }
          console.log(`✅ Default registration code created: ${defaultCode}`);
        } else {
          console.log('ℹ️  Default registration code already exists');
        }
      } catch (err) {
        console.log('⚠️  Could not create default registration code:', err.message);
      }
    }
    
  } catch (err) {
    console.error('❌ Error creating security tables:', err);
  } finally {
    process.exit();
  }
};

createSecurityTables();

