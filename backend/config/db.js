const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'jail_visitation.sqlite');
const sqliteDb = new sqlite3.Database(dbFilePath);

// Initialize schema (SQLite-compatible)
const schemaStatements = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pdls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  cell_number TEXT NOT NULL,
  criminal_case_no TEXT,
  offense_charge TEXT,
  court_branch TEXT,
  arrest_date TEXT,
  commitment_date TEXT,
  first_time_offender INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pdl_id INTEGER NOT NULL,
  visitor_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  age INTEGER,
  address TEXT NOT NULL,
  valid_id TEXT NOT NULL,
  date_of_application TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  verified_conjugal INTEGER DEFAULT 0,
  time_in TEXT,
  time_out TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (pdl_id) REFERENCES pdls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS denied_visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_name TEXT NOT NULL,
  pdl_name TEXT NOT NULL,
  cell TEXT NOT NULL,
  time_in TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scanned_visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_name TEXT NOT NULL,
  pdl_name TEXT NOT NULL,
  cell TEXT NOT NULL,
  time_in TEXT NOT NULL,
  time_out TEXT,
  scan_date TEXT NOT NULL,
  relationship TEXT,
  contact_number TEXT,
  purpose TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  security_question_1 TEXT NOT NULL DEFAULT '',
  security_answer_1 TEXT NOT NULL DEFAULT '',
  security_question_2 TEXT NOT NULL DEFAULT '',
  security_answer_2 TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cell_number TEXT NOT NULL,
  cell_name TEXT,
  capacity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
`;

sqliteDb.serialize(() => {
  sqliteDb.exec(schemaStatements, (err) => {
    if (err) {
      console.error('❌ Failed to initialize SQLite schema:', err);
    } else {
      console.log('✅ SQLite database initialized at', dbFilePath);
      // Ensure new columns exist for backward-compatible upgrades
      const ensureColumn = (table, column, type, defaultClause = '') => {
        sqliteDb.all(`PRAGMA table_info(${table});`, (e, rows) => {
          if (e) return console.error(`Failed to read schema for ${table}:`, e);
          const has = rows && rows.some(r => r.name === column);
          if (!has) {
            const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${type} ${defaultClause}`.trim();
            sqliteDb.run(sql, (alterErr) => {
              if (alterErr) console.error(`Failed to add ${table}.${column}:`, alterErr);
              else console.log(`Added column ${table}.${column}`);
            });
          }
        });
      };

      // Visitors: verified_conjugal INTEGER DEFAULT 0
      ensureColumn('visitors', 'verified_conjugal', 'INTEGER', 'DEFAULT 0');
      // Scanned visitors: purpose TEXT
      ensureColumn('scanned_visitors', 'purpose', 'TEXT');
      // Users: security questions/answers
      ensureColumn('users', 'security_question_1', 'TEXT', "NOT NULL DEFAULT ''");
      ensureColumn('users', 'security_answer_1', 'TEXT', "NOT NULL DEFAULT ''");
      ensureColumn('users', 'security_question_2', 'TEXT', "NOT NULL DEFAULT ''");
      ensureColumn('users', 'security_answer_2', 'TEXT', "NOT NULL DEFAULT ''");
      
      // Migration: Rename dorm columns to cell
      const migrateDormToCell = () => {
        // Check if dorm_number exists in pdls table and rename to cell_number
        sqliteDb.all(`PRAGMA table_info(pdls);`, (e, rows) => {
          if (e) return console.error('Failed to read pdls schema:', e);
          const hasDormNumber = rows && rows.some(r => r.name === 'dorm_number');
          const hasCellNumber = rows && rows.some(r => r.name === 'cell_number');
          if (hasDormNumber && !hasCellNumber) {
            sqliteDb.run(`ALTER TABLE pdls RENAME COLUMN dorm_number TO cell_number`, (alterErr) => {
              if (alterErr) console.error('Failed to rename pdls.dorm_number to cell_number:', alterErr);
              else console.log('Renamed pdls.dorm_number to cell_number');
            });
          }
        });
        
        // Check if dorm exists in denied_visitors table and rename to cell
        sqliteDb.all(`PRAGMA table_info(denied_visitors);`, (e, rows) => {
          if (e) return console.error('Failed to read denied_visitors schema:', e);
          const hasDorm = rows && rows.some(r => r.name === 'dorm');
          const hasCell = rows && rows.some(r => r.name === 'cell');
          if (hasDorm && !hasCell) {
            sqliteDb.run(`ALTER TABLE denied_visitors RENAME COLUMN dorm TO cell`, (alterErr) => {
              if (alterErr) console.error('Failed to rename denied_visitors.dorm to cell:', alterErr);
              else console.log('Renamed denied_visitors.dorm to cell');
            });
          }
        });
        
        // Check if dorm exists in scanned_visitors table and rename to cell
        sqliteDb.all(`PRAGMA table_info(scanned_visitors);`, (e, rows) => {
          if (e) return console.error('Failed to read scanned_visitors schema:', e);
          const hasDorm = rows && rows.some(r => r.name === 'dorm');
          const hasCell = rows && rows.some(r => r.name === 'cell');
          if (hasDorm && !hasCell) {
            sqliteDb.run(`ALTER TABLE scanned_visitors RENAME COLUMN dorm TO cell`, (alterErr) => {
              if (alterErr) console.error('Failed to rename scanned_visitors.dorm to cell:', alterErr);
              else console.log('Renamed scanned_visitors.dorm to cell');
            });
          }
        });
      };
      
      // Run migration
      migrateDormToCell();
    }
  });
});

// Provide a mysql2-like interface for compatibility: db.query(sql, params?)
// - Promise form: resolves to [rows]
// - Callback form: db.query(sql, params?, (err, rowsOrResult) => {})
function query(sql, params, cb) {
  const hasCallback = typeof params === 'function' || typeof cb === 'function';
  const callback = typeof params === 'function' ? params : cb;
  const effectiveParams = Array.isArray(params) ? params : (cb ? params : []);

  const isSelect = /^\s*select/i.test(sql);
  const isInsert = /^\s*insert/i.test(sql);
  const isUpdate = /^\s*update/i.test(sql);
  const isDelete = /^\s*delete/i.test(sql);

  const execSelect = () => new Promise((resolve, reject) => {
    sqliteDb.all(sql, effectiveParams, (err, rows) => {
      if (err) return reject(err);
      resolve([rows]);
    });
  });

  const execRun = () => new Promise((resolve, reject) => {
    sqliteDb.run(sql, effectiveParams, function(err) {
      if (err) return reject(err);
      // Mimic mysql2 result object shape as much as possible
      resolve([{ insertId: this.lastID, affectedRows: this.changes, changes: this.changes }]);
    });
  });

  const executor = isSelect ? execSelect : execRun;

  if (hasCallback) {
    executor()
      .then(([result]) => callback(null, result))
      .catch((err) => callback(err));
    return;
  }
  return executor();
}

module.exports = {
  query,
  _raw: sqliteDb
};
