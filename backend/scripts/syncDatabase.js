const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
// Try loading from backend/.env first, then root .env, then current working dir
const backendEnvPath = path.join(__dirname, '..', '.env');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

// Config connection strings
const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

// Determine SQLite path
let sqlitePath = process.env.SQLITE_DB_PATH;
if (!sqlitePath) {
  if (process.env.USER_DATA_PATH) {
    sqlitePath = path.join(process.env.USER_DATA_PATH, 'data', 'jail_visitation.sqlite');
  } else if (process.env.APPDATA) {
    // Windows AppData Roaming path
    sqlitePath = path.join(process.env.APPDATA, 'jail-information-system', 'data', 'jail_visitation.sqlite');
  } else if (process.platform === 'darwin') {
    // macOS Library App Support path
    sqlitePath = path.join(process.env.HOME, 'Library', 'Application Support', 'jail-information-system', 'data', 'jail_visitation.sqlite');
  } else if (process.platform === 'linux') {
    // Linux config path
    sqlitePath = path.join(process.env.HOME, '.config', 'jail-information-system', 'data', 'jail_visitation.sqlite');
  } else {
    // Fallback to local workspace directory
    sqlitePath = path.join(__dirname, '..', 'data', 'jail_visitation.sqlite');
  }
}

const TABLES = [
  'cells',
  'pdls',
  'visitors',
  'denied_visitors',
  'scanned_visitors',
  'users',
  'registration_codes',
  'account_lockouts',
  'password_reset_tokens',
  'weekly_cell_schedule'
];

// Helper to align SQLite table columns with PostgreSQL dynamically
const getSqliteColumns = (sqliteDb, tableName) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(`PRAGMA table_info(${tableName});`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.name.toLowerCase()));
    });
  });
};

const alignSchemas = async (sqliteDb, tableName, pgRow) => {
  const sqliteCols = await getSqliteColumns(sqliteDb, tableName);
  const pgCols = Object.keys(pgRow);
  for (const col of pgCols) {
    if (!sqliteCols.includes(col.toLowerCase())) {
      console.log(`⚠️  SQLite table '${tableName}' is missing column '${col}'. Dynamically adding...`);
      let type = 'TEXT';
      const val = pgRow[col];
      if (Number.isInteger(val)) type = 'INTEGER';
      else if (typeof val === 'number') type = 'REAL';
      else if (val instanceof Date) type = 'TEXT';
      
      await new Promise((resolve, reject) => {
        sqliteDb.run(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${type}`, (err) => {
          if (err) reject(err);
          else {
            console.log(`  ✅ Added column '${col}' to SQLite table '${tableName}'`);
            resolve();
          }
        });
      });
    }
  }
};

// Initialize SQLite Schema if database file is empty/new
const initializeSqliteSchema = (sqliteDb) => {
  return new Promise((resolve, reject) => {
    const schemaStatements = `
      PRAGMA foreign_keys = ON;
      
      CREATE TABLE IF NOT EXISTS cells (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cell_number TEXT NOT NULL,
        cell_name TEXT,
        capacity INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

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
        telegram_username TEXT,
        telegram_chat_id INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS registration_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        is_used INTEGER DEFAULT 0,
        use_limit INTEGER DEFAULT 1,
        used_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        used_at TEXT
      );

      CREATE TABLE IF NOT EXISTS account_lockouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        failed_attempts INTEGER DEFAULT 0,
        last_attempt TEXT,
        locked_until TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        telegram_username TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS weekly_cell_schedule (
        day_key TEXT NOT NULL,
        cell_id INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (day_key, cell_id)
      );
    `;

    sqliteDb.exec(schemaStatements, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const runSyncFromNeon = async () => {
  if (!neonUrl) {
    console.error('❌ Error: NEON_DATABASE_URL or DATABASE_URL environment variable is not defined.');
    console.error('   Please define NEON_DATABASE_URL in your backend/.env file.');
    process.exit(1);
  }

  console.log('📡 Starting Database synchronization from NEON to SQLite...');
  console.log(`🔌 Neon DB Host: ${new URL(neonUrl).hostname}`);
  console.log(`📂 SQLite Database path: ${sqlitePath}`);

  // Ensure target folder exists
  const sqliteDir = path.dirname(sqlitePath);
  if (!fs.existsSync(sqliteDir)) {
    console.log(`📁 Target directory does not exist. Creating: ${sqliteDir}`);
    fs.mkdirSync(sqliteDir, { recursive: true });
  }

  const pgPool = new Pool({ connectionString: neonUrl });
  const sqliteDb = new sqlite3.Database(sqlitePath);

  try {
    // 1. Drop existing tables to ensure a clean schema without legacy constraints (since we are overwriting all data)
    console.log('🗑️  Clearing existing SQLite tables and constraints...');
    await new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        sqliteDb.run('PRAGMA foreign_keys = OFF;');
        // Drop in reverse order to respect potential dependency drops
        const reverseTables = [...TABLES].reverse();
        for (const table of reverseTables) {
          sqliteDb.run(`DROP TABLE IF EXISTS ${table};`, (err) => {
            if (err) console.warn(`⚠️  Failed to drop table ${table}:`, err.message);
          });
        }
        resolve();
      });
    });

    // 2. Initialize schema in SQLite
    console.log('📋 Initializing clean SQLite database schema...');
    await initializeSqliteSchema(sqliteDb);
    console.log('✅ SQLite schema verified.');

    // 3. Disable Foreign Key checks temporarily in SQLite for safe clear/sync
    await new Promise((resolve, reject) => {
      sqliteDb.run('PRAGMA foreign_keys = OFF;', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 3. For each table, sync data
    for (const table of TABLES) {
      console.log(`\n⏳ Syncing table '${table}'...`);

      // Get PostgreSQL data
      const pgRes = await pgPool.query(`SELECT * FROM ${table}`);
      console.log(`   Found ${pgRes.rows.length} rows in Neon.`);

      // Clear SQLite data
      await new Promise((resolve, reject) => {
        sqliteDb.run(`DELETE FROM ${table}`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (pgRes.rows.length > 0) {
        // Dynamic schema alignment check
        await alignSchemas(sqliteDb, table, pgRes.rows[0]);

        const columns = Object.keys(pgRes.rows[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertStmt = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        // Insert into SQLite
        await new Promise((resolve, reject) => {
          sqliteDb.serialize(() => {
            sqliteDb.run('BEGIN TRANSACTION;');
            const stmt = sqliteDb.prepare(insertStmt);
            
            for (const row of pgRes.rows) {
              const values = columns.map(col => {
                const val = row[col];
                // Convert Date objects to ISO string representation for SQLite compatibility
                if (val instanceof Date) {
                  return val.toISOString();
                }
                return val;
              });
              stmt.run(values, (err) => {
                if (err) {
                  console.error(`❌ Error inserting row in ${table}:`, err.message);
                }
              });
            }

            stmt.finalize((err) => {
              if (err) {
                sqliteDb.run('ROLLBACK;');
                reject(err);
              } else {
                sqliteDb.run('COMMIT;', (commitErr) => {
                  if (commitErr) reject(commitErr);
                  else resolve();
                });
              }
            });
          });
        });
        console.log(`   ✅ Synced ${pgRes.rows.length} rows to SQLite.`);
      } else {
        console.log(`   ✓ SQLite table '${table}' cleared (Neon table is empty).`);
      }
    }

    // 4. Re-enable SQLite Foreign Keys
    await new Promise((resolve, reject) => {
      sqliteDb.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('\n🎉 Synchronization from Neon to local SQLite complete!');
    console.log('💡 Note: Remember to comment out DATABASE_URL in your .env to run the app offline.');

  } catch (err) {
    console.error('\n❌ Synchronization failed:', err);
  } finally {
    await pgPool.end();
    sqliteDb.close();
  }
};

const runSyncToNeon = async () => {
  if (!neonUrl) {
    console.error('❌ Error: NEON_DATABASE_URL or DATABASE_URL environment variable is not defined.');
    console.error('   Please define NEON_DATABASE_URL in your backend/.env file.');
    process.exit(1);
  }

  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ Error: Local SQLite database file not found at: ${sqlitePath}`);
    process.exit(1);
  }

  console.log('📡 Starting Database backup from SQLite to NEON...');
  console.log(`📂 SQLite Database path: ${sqlitePath}`);
  console.log(`🔌 Neon DB Host: ${new URL(neonUrl).hostname}`);

  const pgPool = new Pool({ connectionString: neonUrl });
  const sqliteDb = new sqlite3.Database(sqlitePath);

  try {
    // 1. Truncate all PostgreSQL tables with CASCADE to reset them
    console.log('🗑️  Clearing all tables in Neon database...');
    const truncateList = TABLES.join(', ');
    await pgPool.query(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`);
    console.log('✅ Neon database cleared.');

    // 2. Fetch and upload data for each table
    for (const table of TABLES) {
      console.log(`\n⏳ Syncing table '${table}'...`);

      // Read from SQLite
      const sqliteRows = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log(`   Found ${sqliteRows.length} rows in SQLite.`);

      if (sqliteRows.length > 0) {
        const columns = Object.keys(sqliteRows[0]);
        
        // postgres parameter numbers ($1, $2, etc)
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

        const client = await pgPool.connect();
        try {
          await client.query('BEGIN');
          for (const row of sqliteRows) {
            const values = columns.map(col => {
              const val = row[col];
              // Convert boolean representation if needed, though SQLite stores as 1/0
              return val;
            });
            await client.query(insertQuery, values);
          }
          await client.query('COMMIT');
        } catch (insertErr) {
          await client.query('ROLLBACK');
          throw insertErr;
        } finally {
          client.release();
        }

        // Reset PostgreSQL serial sequence if the table has an auto-incrementing key
        if (table !== 'weekly_cell_schedule') {
          await pgPool.query(`
            SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM ${table}
          `);
        }

        console.log(`   ✅ Uploaded ${sqliteRows.length} rows to Neon.`);
      } else {
        console.log(`   ✓ Neon table '${table}' remains empty.`);
      }
    }

    console.log('\n🎉 Backup from local SQLite to Neon complete!');

  } catch (err) {
    console.error('\n❌ Backup failed:', err);
  } finally {
    await pgPool.end();
    sqliteDb.close();
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--from-neon')) {
  runSyncFromNeon();
} else if (args.includes('--to-neon')) {
  runSyncToNeon();
} else {
  console.log('🤖 Database Sync Utility');
  console.log('Usage:');
  console.log('  Download from Neon:  node backend/scripts/syncDatabase.js --from-neon');
  console.log('  Upload to Neon:      node backend/scripts/syncDatabase.js --to-neon');
  process.exit(0);
}
