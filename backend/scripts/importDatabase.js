const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Import SQL file into SQLite database
 * Usage: node backend/scripts/importDatabase.js [path-to-sql-file]
 */
const importDatabase = () => {
  const sqlFilePath = process.argv[2] || path.join(__dirname, '..', '..', 'database_export.sql');
  const dbPath = path.join(__dirname, '..', 'data', 'jail_visitation.sqlite');

  if (!fs.existsSync(sqlFilePath)) {
    console.error('❌ SQL file not found:', sqlFilePath);
    console.log('Usage: node backend/scripts/importDatabase.js [path-to-sql-file]');
    process.exit(1);
  }

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      process.exit(1);
    }
  });

  console.log('📥 Importing database...');
  console.log(`   Source: ${sqlFilePath}`);
  console.log(`   Target: ${dbPath}`);

  // Split SQL into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let imported = 0;
  let errors = 0;

  db.serialize(() => {
    statements.forEach((statement, index) => {
      if (statement.trim()) {
        db.run(statement, (err) => {
          if (err) {
            // Ignore "table already exists" errors during import
            if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
              console.error(`⚠️  Error executing statement ${index + 1}:`, err.message);
              errors++;
            }
          } else {
            imported++;
          }

          // Last statement
          if (index === statements.length - 1) {
            console.log(`✅ Import completed!`);
            console.log(`   Statements executed: ${imported}`);
            if (errors > 0) {
              console.log(`   Errors: ${errors}`);
            }
            db.close();
            process.exit(0);
          }
        });
      }
    });
  });
};

importDatabase();

