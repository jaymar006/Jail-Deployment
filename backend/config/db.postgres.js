const { Pool } = require('pg');

// Get database URL from environment variable (Neon provides this)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
}

// Create connection pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
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
  security_question_1 TEXT NOT NULL DEFAULT '',
  security_answer_1 TEXT NOT NULL DEFAULT '',
  security_question_2 TEXT NOT NULL DEFAULT '',
  security_answer_2 TEXT NOT NULL DEFAULT '',
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
      // Split and execute schema statements
      const statements = schemaStatements
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }

      // Ensure columns exist (for migrations)
      await ensureColumns(client);
      
      console.log('✅ PostgreSQL schema initialized');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL schema:', error);
    throw error;
  }
};

// Ensure columns exist for backward compatibility
const ensureColumns = async (client) => {
  const checks = [
    { table: 'visitors', column: 'verified_conjugal', type: 'INTEGER', default: 'DEFAULT 0' },
    { table: 'scanned_visitors', column: 'purpose', type: 'TEXT' },
    { table: 'users', column: 'security_question_1', type: 'TEXT', default: "DEFAULT ''" },
    { table: 'users', column: 'security_answer_1', type: 'TEXT', default: "DEFAULT ''" },
    { table: 'users', column: 'security_question_2', type: 'TEXT', default: "DEFAULT ''" },
    { table: 'users', column: 'security_answer_2', type: 'TEXT', default: "DEFAULT ''" },
  ];

  for (const check of checks) {
    try {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [check.table, check.column]);

      if (result.rows.length === 0) {
        await client.query(`
          ALTER TABLE ${check.table} 
          ADD COLUMN ${check.column} ${check.type} ${check.default || ''}
        `);
        console.log(`Added column ${check.table}.${check.column}`);
      }
    } catch (error) {
      // Column might already exist or table doesn't exist yet
      if (!error.message.includes('already exists')) {
        console.error(`Error checking column ${check.table}.${check.column}:`, error.message);
      }
    }
  }
};

// Initialize schema on module load
initializeSchema().catch(console.error);

// Provide mysql2-like interface for compatibility: db.query(sql, params?)
async function query(sql, params, cb) {
  const hasCallback = typeof params === 'function' || typeof cb === 'function';
  const callback = typeof params === 'function' ? params : cb;
  const effectiveParams = Array.isArray(params) ? params : (cb ? params : []);

  try {
    const result = await pool.query(sql, effectiveParams);
    
    // Mimic mysql2 result format
    const rows = result.rows;
    
    // For INSERT statements, get the inserted ID from RETURNING clause or first row
    let insertId = null;
    if (/^\s*insert/i.test(sql) && rows.length > 0 && rows[0].id) {
      insertId = rows[0].id;
    } else if (/^\s*insert/i.test(sql) && result.insertId) {
      insertId = result.insertId;
    }

    if (hasCallback) {
      // Return rows array to match mysql2 format [rows]
      callback(null, [rows]);
      return;
    }
    
    return [rows];
  } catch (error) {
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
  _raw: pool
};

