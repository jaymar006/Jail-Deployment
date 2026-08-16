const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

const backendEnvPath = path.join(__dirname, '..', '.env');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const neonUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const sqliteDir = path.join(__dirname, '..', 'data');
let sqlitePath = process.env.SQLITE_DB_PATH || process.env.DB_PATH;

if (!sqlitePath) {
  sqlitePath = path.join(sqliteDir, 'jail_visitation.sqlite');
} else if (!path.isAbsolute(sqlitePath)) {
  sqlitePath = path.join(__dirname, '..', '..', sqlitePath);
}

const TABLES = [
  'cells',
  'pdls',
  'visitors',
  'denied_visitors',
  'scanned_visitors',
  'users',
  'registration_codes',
  'password_reset_tokens',
  'weekly_cell_schedule',
];

const NO_ID_TABLES = new Set(['weekly_cell_schedule']);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const autoYes = args.includes('--yes');

if (!neonUrl) {
  console.error('❌ Error: NEON_DATABASE_URL or DATABASE_URL environment variable is not defined.');
  console.error('   Set it in .env or the root .env file.');
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.error(`❌ Error: SQLite database file not found at: ${sqlitePath}`);
  process.exit(1);
}

process.env.DATABASE_URL = neonUrl;
process.env.NODE_ENV = 'production';

const db = require('../config/db.postgres');
const pool = db.pool;

const sqliteDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);

const getSqliteColumns = (tableName) =>
  new Promise((resolve, reject) => {
    sqliteDb.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map((r) => r.name));
    });
  });

const getSqliteRows = (tableName) =>
  new Promise((resolve, reject) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const getNeonColumns = async (tableName) => {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return res.rows.map((r) => r.column_name);
};

const prompt = (query) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

async function main() {
  await db.waitForSchema();

  const summary = [];
  for (const table of TABLES) {
    const rows = await getSqliteRows(table);
    summary.push({ table, rows: rows.length });
  }

  console.log('📋 SQLite database: ' + sqlitePath);
  console.log(`🔌 Neon database: ${new URL(neonUrl).hostname}\n`);
  console.log('Expected rows to import:');
  for (const { table, rows } of summary) {
    console.log(`   ${table}: ${rows}`);
  }

  if (dryRun) {
    console.log('\n🧪 Dry run completed. No changes were made to Neon.');
    await pool.end();
    sqliteDb.close();
    process.exit(0);
  }

  if (!autoYes) {
    const answer = await prompt(
      '\n⚠️  This will TRUNCATE all tables in Neon and replace them with the local SQLite data.\nType "yes" to continue: '
    );
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted. No changes were made to Neon.');
      await pool.end();
      sqliteDb.close();
      process.exit(0);
    }
  }

  await pool.query(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  console.log('🗑️  All Neon tables truncated.');

  for (const table of TABLES) {
    const sqliteCols = await getSqliteColumns(table);
    const neonCols = await getNeonColumns(table);
    const columns = sqliteCols.filter((c) => neonCols.includes(c));

    const rows = await getSqliteRows(table);
    console.log(`\n⏳ Importing '${table}' (${rows.length} rows)...`);

    if (rows.length === 0) {
      console.log(`   ✓ Neon table '${table}' remains empty.`);
      continue;
    }

    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    const insertQuery = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        const values = columns.map((col) => {
          const val = row[col];
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'boolean') return val;
          return val;
        });
        await client.query(insertQuery, values);
      }
      await client.query('COMMIT');
      console.log(`   ✅ Imported ${rows.length} rows into Neon.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Error importing into '${table}':`, err.message);
      await client.release();
      throw err;
    }
    client.release();

    if (!NO_ID_TABLES.has(table)) {
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM ${table}`
      );
    }
  }

  console.log('\n🎉 Import from SQLite to Neon complete!');
  await pool.end();
  sqliteDb.close();
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
