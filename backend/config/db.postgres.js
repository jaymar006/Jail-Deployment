const { Pool } = require('pg');

// Get database URL from environment variable (Neon provides this)
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
}

// Clean up common mistakes: remove psql command, quotes, etc.
connectionString = connectionString.trim();

// Remove psql command prefix if present
if (connectionString.startsWith('psql')) {
  console.warn('⚠️  Removing "psql" prefix from DATABASE_URL');
  // Extract the connection string from psql command
  const match = connectionString.match(/(?:psql\s+)?['"]?(postgresql?:\/\/[^'"]+)['"]?/);
  if (match && match[1]) {
    connectionString = match[1];
  } else {
    // Fallback: remove psql and quotes
    connectionString = connectionString.replace(/^psql\s+/, '').replace(/^['"]|['"]$/g, '');
  }
}

// Remove surrounding quotes if present
connectionString = connectionString.replace(/^['"]|['"]$/g, '').trim();

// Validate connection string format
if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
  console.error('❌ Invalid DATABASE_URL format. Expected: postgresql://user:password@host/dbname');
  console.error('   Current value starts with:', connectionString.substring(0, 50) + '...');
  console.error('   💡 Make sure you copied ONLY the connection string, not the psql command');
  throw new Error('DATABASE_URL must start with postgresql:// or postgres://');
}

// Log connection info (without password) for debugging
try {
  const url = new URL(connectionString);
  console.log('🔌 Connecting to PostgreSQL:');
  console.log('   Host:', url.hostname);
  console.log('   Database:', url.pathname.substring(1));
  console.log('   User:', url.username);
} catch (e) {
  console.error('❌ Failed to parse DATABASE_URL:', e.message);
  throw new Error('Invalid DATABASE_URL format. Please check your connection string.');
}

// Create connection pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection (silent - connection is logged elsewhere)
pool.on('connect', () => {
  // Connection successful - no need to log every connection
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// PostgreSQL schema (converted from SQLite)
const schemaStatements = `
-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create pdls table
CREATE TABLE IF NOT EXISTS pdls (
  id SERIAL PRIMARY KEY,
  last_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  cell_number VARCHAR(50) NOT NULL,
  criminal_case_no VARCHAR(100),
  offense_charge VARCHAR(255),
  court_branch VARCHAR(255),
  arrest_date DATE,
  commitment_date DATE,
  first_time_offender INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  pdl_id INTEGER NOT NULL,
  visitor_id VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100) NOT NULL,
  age INTEGER,
  address VARCHAR(255) NOT NULL,
  valid_id VARCHAR(255) NOT NULL,
  date_of_application DATE NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  verified_conjugal INTEGER DEFAULT 0,
  time_in TIMESTAMP,
  time_out TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pdl_id) REFERENCES pdls(id) ON DELETE CASCADE
);

-- Create denied_visitors table
CREATE TABLE IF NOT EXISTS denied_visitors (
  id SERIAL PRIMARY KEY,
  visitor_name VARCHAR(255) NOT NULL,
  pdl_name VARCHAR(255) NOT NULL,
  cell VARCHAR(50) NOT NULL,
  time_in TIMESTAMP NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create scanned_visitors table
CREATE TABLE IF NOT EXISTS scanned_visitors (
  id SERIAL PRIMARY KEY,
  visitor_name VARCHAR(255) NOT NULL,
  pdl_name VARCHAR(255) NOT NULL,
  cell VARCHAR(50) NOT NULL,
  time_in TIMESTAMP NOT NULL,
  time_out TIMESTAMP,
  scan_date TIMESTAMP NOT NULL,
  relationship VARCHAR(100),
  contact_number VARCHAR(50),
  purpose TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  telegram_username VARCHAR(255),
  telegram_chat_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cells table
CREATE TABLE IF NOT EXISTS cells (
  id SERIAL PRIMARY KEY,
  cell_number VARCHAR(50) NOT NULL,
  cell_name VARCHAR(255),
  capacity INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create registration_codes table
CREATE TABLE IF NOT EXISTS registration_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  use_limit INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_registration_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_is_used ON registration_codes(is_used);

-- Create account_lockouts table
CREATE TABLE IF NOT EXISTS account_lockouts (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  failed_attempts INTEGER DEFAULT 0,
  last_attempt TIMESTAMP,
  locked_until TIMESTAMP,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  telegram_username VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_lockout_username ON account_lockouts(username);
CREATE INDEX IF NOT EXISTS idx_lockout_locked_until ON account_lockouts(locked_until);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_pdls_updated_at BEFORE UPDATE ON pdls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_denied_visitors_updated_at BEFORE UPDATE ON denied_visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scanned_visitors_updated_at BEFORE UPDATE ON scanned_visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON cells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Initialize schema
const initializeSchema = async () => {
  try {
    const client = await pool.connect();
    try {
      console.log('📋 Initializing PostgreSQL schema...');
      
      // Create tables first (simpler statements)
      const tableStatements = [
        `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
        `CREATE TABLE IF NOT EXISTS pdls (
          id SERIAL PRIMARY KEY,
          last_name VARCHAR(255) NOT NULL,
          first_name VARCHAR(255) NOT NULL,
          middle_name VARCHAR(255),
          cell_number VARCHAR(50) NOT NULL,
          criminal_case_no VARCHAR(100),
          offense_charge VARCHAR(255),
          court_branch VARCHAR(255),
          arrest_date DATE,
          commitment_date DATE,
          first_time_offender INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS visitors (
          id SERIAL PRIMARY KEY,
          pdl_id INTEGER NOT NULL,
          visitor_id VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          relationship VARCHAR(100) NOT NULL,
          age INTEGER,
          address VARCHAR(255) NOT NULL,
          valid_id VARCHAR(255) NOT NULL,
          date_of_application DATE NOT NULL,
          contact_number VARCHAR(50) NOT NULL,
          verified_conjugal INTEGER DEFAULT 0,
          time_in TIMESTAMP,
          time_out TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pdl_id) REFERENCES pdls(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS denied_visitors (
          id SERIAL PRIMARY KEY,
          visitor_name VARCHAR(255) NOT NULL,
          pdl_name VARCHAR(255) NOT NULL,
          cell VARCHAR(50) NOT NULL,
          time_in TIMESTAMP NOT NULL,
          reason TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS scanned_visitors (
          id SERIAL PRIMARY KEY,
          visitor_name VARCHAR(255) NOT NULL,
          pdl_name VARCHAR(255) NOT NULL,
          cell VARCHAR(50) NOT NULL,
          time_in TIMESTAMP NOT NULL,
          time_out TIMESTAMP,
          scan_date TIMESTAMP NOT NULL,
          relationship VARCHAR(100),
          contact_number VARCHAR(50),
          purpose TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          telegram_username VARCHAR(255),
          telegram_chat_id BIGINT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS cells (
          id SERIAL PRIMARY KEY,
          cell_number VARCHAR(50) NOT NULL,
          cell_name VARCHAR(255),
          capacity INTEGER DEFAULT 1,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS registration_codes (
          id SERIAL PRIMARY KEY,
          code VARCHAR(255) NOT NULL UNIQUE,
          is_used BOOLEAN DEFAULT FALSE,
          use_limit INTEGER DEFAULT 1,
          used_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          used_at TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS account_lockouts (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          failed_attempts INTEGER DEFAULT 0,
          last_attempt TIMESTAMP,
          locked_until TIMESTAMP,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          telegram_username VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      // Create indexes for security tables
      const indexStatements = [
        `CREATE INDEX IF NOT EXISTS idx_registration_code ON registration_codes(code)`,
        `CREATE INDEX IF NOT EXISTS idx_registration_is_used ON registration_codes(is_used)`,
        `CREATE INDEX IF NOT EXISTS idx_lockout_username ON account_lockouts(username)`,
        `CREATE INDEX IF NOT EXISTS idx_lockout_locked_until ON account_lockouts(locked_until)`,
        `CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_tokens(token)`,
        `CREATE INDEX IF NOT EXISTS idx_reset_token_expires ON password_reset_tokens(expires_at)`
      ];

      // Execute table creation statements (silent - tables already exist in production)
      for (const statement of tableStatements) {
        try {
          await client.query(statement);
        } catch (error) {
          const errorMsg = error.message.toLowerCase();
          if (!errorMsg.includes('already exists')) {
            console.error(`   ⚠️  Error creating table:`, error.message.substring(0, 100));
          }
        }
      }

      // Create indexes
      for (const statement of indexStatements) {
        try {
          await client.query(statement);
        } catch (error) {
          const errorMsg = error.message.toLowerCase();
          if (!errorMsg.includes('already exists')) {
            console.warn(`   ⚠️  Index creation warning:`, error.message.substring(0, 100));
          }
        }
      }

      // Create function (silent - function already exists in production)
      try {
        await client.query(`
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$ language 'plpgsql'
        `);
      } catch (error) {
        if (!error.message.toLowerCase().includes('already exists')) {
          console.warn(`   ⚠️  Function creation warning:`, error.message.substring(0, 100));
        }
      }

      // Create triggers
      const triggerStatements = [
        `CREATE TRIGGER update_pdls_updated_at BEFORE UPDATE ON pdls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
        `CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
        `CREATE TRIGGER update_denied_visitors_updated_at BEFORE UPDATE ON denied_visitors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
        `CREATE TRIGGER update_scanned_visitors_updated_at BEFORE UPDATE ON scanned_visitors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
        `CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON cells FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
      ];

      for (const statement of triggerStatements) {
        try {
          await client.query(statement);
        } catch (error) {
          // Triggers might already exist, that's OK
          if (!error.message.toLowerCase().includes('already exists')) {
            console.warn(`   ⚠️  Trigger creation warning:`, error.message.substring(0, 100));
          }
        }
      }

      // Ensure columns exist (for migrations)
      await ensureColumns(client);
      
      console.log('✅ PostgreSQL schema initialized');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL schema:', error.message);
    throw error;
  }
};

// Ensure columns exist for backward compatibility
const ensureColumns = async (client) => {
  const checks = [
    { table: 'visitors', column: 'verified_conjugal', type: 'INTEGER', default: 'DEFAULT 0' },
    { table: 'scanned_visitors', column: 'purpose', type: 'TEXT' },
    { table: 'users', column: 'telegram_username', type: 'VARCHAR(255)', default: '' },
    { table: 'users', column: 'telegram_chat_id', type: 'BIGINT', default: null },
    { table: 'registration_codes', column: 'use_limit', type: 'INTEGER', default: 'DEFAULT 1' },
    { table: 'registration_codes', column: 'used_count', type: 'INTEGER', default: 'DEFAULT 0' },
  ];
  
  // Columns to remove (for migration)
  const columnsToRemove = [
    { table: 'users', column: 'email' },
    { table: 'users', column: 'security_question_1' },
    { table: 'users', column: 'security_answer_1' },
    { table: 'users', column: 'security_question_2' },
    { table: 'users', column: 'security_answer_2' },
  ];
  
  // Check and remove old columns
  for (const col of columnsToRemove) {
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [col.table, col.column]);
      
      if (result.rows.length > 0) {
        // Drop column constraints first if needed
        try {
          // Try to drop unique constraint if email column exists
          if (col.column === 'email') {
            await client.query(`
              ALTER TABLE ${col.table} DROP CONSTRAINT IF EXISTS users_email_key
            `);
          }
        } catch (constraintError) {
          // Constraint might not exist, that's OK
        }
        
        await client.query(`ALTER TABLE ${col.table} DROP COLUMN IF EXISTS ${col.column}`);
        console.log(`Removed column ${col.table}.${col.column}`);
      }
    } catch (error) {
      // Column might not exist, that's OK
      if (!error.message.includes('does not exist')) {
        console.error(`Error removing column ${col.table}.${col.column}:`, error.message);
      }
    }
  }
  
  // Migrate password_reset_tokens table: rename email to telegram_username
  try {
    const resetTokensCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'password_reset_tokens' AND column_name = 'email'
    `);
    
    if (resetTokensCheck.rows.length > 0) {
      // Check if telegram_username column already exists
      const telegramColCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' AND column_name = 'telegram_username'
      `);
      
      if (telegramColCheck.rows.length === 0) {
        // Rename email column to telegram_username
        await client.query(`
          ALTER TABLE password_reset_tokens RENAME COLUMN email TO telegram_username
        `);
        console.log('Renamed password_reset_tokens.email to telegram_username');
      } else {
        // If telegram_username exists, drop email column
        await client.query(`
          ALTER TABLE password_reset_tokens DROP COLUMN IF EXISTS email
        `);
        console.log('Removed password_reset_tokens.email column');
      }
    }
  } catch (error) {
    console.error('Error migrating password_reset_tokens table:', error.message);
  }
  
  // Ensure telegram_username has UNIQUE constraint (allowing NULL values)
  try {
    // Check if telegram_username column exists
    const telegramCheck = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = $2
    `, ['users', 'telegram_username']);
    
    if (telegramCheck.rows.length > 0) {
      // Ensure column is nullable (allow NULL)
      const colInfo = telegramCheck.rows[0];
      if (colInfo.is_nullable === 'NO') {
        try {
          await client.query(`
            ALTER TABLE users ALTER COLUMN telegram_username DROP NOT NULL
          `);
          console.log('✅ Made telegram_username nullable');
        } catch (error) {
          // Column might already be nullable, that's OK
          if (!error.message.includes('does not exist')) {
            console.warn('⚠️  Could not make telegram_username nullable:', error.message);
          }
        }
      }
      
      // Add UNIQUE constraint using partial index (only for non-NULL values)
      // This allows multiple NULL values but ensures uniqueness for non-NULL values
      const uniqueIndexCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname = 'users_telegram_username_unique_idx'
      `);
      
      if (uniqueIndexCheck.rows.length === 0) {
        // Check for duplicates before adding constraint
        const duplicateCheck = await client.query(`
          SELECT telegram_username, COUNT(*) as count
          FROM users
          WHERE telegram_username IS NOT NULL
          GROUP BY telegram_username
          HAVING COUNT(*) > 1
        `);
        
        if (duplicateCheck.rows.length > 0) {
          console.warn(`⚠️  Found duplicate telegram_username values. Cannot add UNIQUE constraint yet.`);
          console.warn(`   Duplicates:`, duplicateCheck.rows.map(r => `${r.telegram_username} (${r.count} times)`));
        } else {
          try {
            // Create partial unique index (only for non-NULL values)
            await client.query(`
              CREATE UNIQUE INDEX users_telegram_username_unique_idx 
              ON users (telegram_username) 
              WHERE telegram_username IS NOT NULL
            `);
            console.log('✅ Added UNIQUE constraint (partial index) to users.telegram_username');
          } catch (uniqueError) {
            console.warn('⚠️  Could not add UNIQUE constraint:', uniqueError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error ensuring telegram_username constraints:', error.message);
    console.error('   Error details:', error);
  }

  for (const check of checks) {
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [check.table, check.column]);

      if (result.rows.length === 0) {
        // Build the ALTER TABLE statement
        let alterSql = `ALTER TABLE ${check.table} ADD COLUMN ${check.column} ${check.type}`;
        if (check.default !== null && check.default !== undefined && check.default !== '') {
          alterSql += ` ${check.default}`;
        }
        // If default is null or empty string, column will be nullable (default behavior)
        
        await client.query(alterSql);
        console.log(`✅ Added column ${check.table}.${check.column} (${check.type})`);
      } else {
        console.log(`✓ Column ${check.table}.${check.column} already exists`);
      }
    } catch (error) {
      // Column might already exist or table doesn't exist yet
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`✓ Column ${check.table}.${check.column} already exists (caught in error)`);
      } else {
        console.error(`❌ Error checking/adding column ${check.table}.${check.column}:`, error.message);
      }
    }
  }
};

// Initialize schema on module load
// Use a promise that resolves when schema is ready
let schemaInitialized = false;
let schemaInitPromise = initializeSchema()
  .then(() => {
    schemaInitialized = true;
    console.log('✅ PostgreSQL schema ready');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize PostgreSQL schema:', error);
    // Don't throw - allow server to start but log the error
    schemaInitialized = false;
  });

// Export a function to wait for schema initialization
const waitForSchema = async () => {
  await schemaInitPromise;
  if (!schemaInitialized) {
    throw new Error('Schema initialization failed');
  }
};

// Convert MySQL/SQLite style ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql, params) {
  if (!Array.isArray(params) || params.length === 0) {
    return { sql, params };
  }

  let paramIndex = 1;
  const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { sql: convertedSql, params };
}

// Convert SQLite datetime functions to PostgreSQL equivalents
function convertSQLiteFunctions(sql) {
  // Convert datetime('now') to CURRENT_TIMESTAMP
  sql = sql.replace(/datetime\s*\(\s*['"]now['"]\s*\)/gi, 'CURRENT_TIMESTAMP');
  
  // Convert date('now') to CURRENT_DATE
  sql = sql.replace(/date\s*\(\s*['"]now['"]\s*\)/gi, 'CURRENT_DATE');
  
  // Convert time('now') to CURRENT_TIME
  sql = sql.replace(/time\s*\(\s*['"]now['"]\s*\)/gi, 'CURRENT_TIME');
  
  return sql;
}

// Add RETURNING id to INSERT statements if not present (for PostgreSQL)
function addReturningClause(sql) {
  const trimmedSql = sql.trim();
  if (/^\s*insert/i.test(trimmedSql) && !/returning/i.test(trimmedSql)) {
    // Check if table has an id column (most tables do)
    const tableMatch = trimmedSql.match(/insert\s+into\s+(\w+)/i);
    if (tableMatch) {
      // Add RETURNING id before semicolon or at end
      if (trimmedSql.endsWith(';')) {
        return trimmedSql.slice(0, -1) + ' RETURNING id;';
      }
      return trimmedSql + ' RETURNING id';
    }
  }
  return sql;
}

// Provide mysql2-like interface for compatibility: db.query(sql, params?)
async function query(sql, params, cb) {
  const hasCallback = typeof params === 'function' || typeof cb === 'function';
  const callback = typeof params === 'function' ? params : cb;
  const effectiveParams = Array.isArray(params) ? params : (cb ? params : []);

  try {
    // Convert SQLite functions to PostgreSQL equivalents
    const sqlWithPostgresFunctions = convertSQLiteFunctions(sql);
    
    // Convert ? placeholders to $1, $2, etc. for PostgreSQL
    const { sql: convertedSql, params: convertedParams } = convertPlaceholders(sqlWithPostgresFunctions, effectiveParams);
    
    // Add RETURNING id to INSERT statements
    const finalSql = addReturningClause(convertedSql);
    
    const result = await pool.query(finalSql, convertedParams);
    
    // Mimic mysql2 result format
    const rows = result.rows;
    
    // For INSERT statements, get the inserted ID from RETURNING clause
    let insertId = null;
    if (/^\s*insert/i.test(finalSql)) {
      if (rows.length > 0 && rows[0] && rows[0].id) {
        insertId = rows[0].id;
      }
    }

    // Handle different query types
    const isSelect = /^\s*select/i.test(finalSql);
    const isInsert = /^\s*insert/i.test(finalSql);
    const isUpdate = /^\s*update/i.test(finalSql);
    const isDelete = /^\s*delete/i.test(finalSql);

    if (isSelect) {
      // SELECT queries: return [rows] where rows is an array
      if (hasCallback) {
        callback(null, [rows]);
        return;
      }
      return [rows];
    } else {
      // INSERT/UPDATE/DELETE: return [result] where result has insertId and affectedRows
      const mysql2Result = {
        insertId: insertId,
        affectedRows: result.rowCount || 0,
        rows: rows
      };

      if (hasCallback) {
        callback(null, [mysql2Result]);
        return;
      }
      
      return [mysql2Result];
    }
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('SQL:', sql);
    if (hasCallback) {
      callback(error);
      return;
    }
    throw error;
  }
}

module.exports = {
  query,
  pool,
  _raw: pool,
  waitForSchema,
  schemaInitialized: () => schemaInitialized
};

