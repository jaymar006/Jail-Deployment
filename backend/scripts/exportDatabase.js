const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

/**
 * Export SQLite database to SQL file
 * This creates a SQL dump that can be imported later
 */
const exportDatabase = () => {
  const dbPath = path.join(__dirname, '..', 'data', 'jail_visitation.sqlite');
  const outputPath = path.join(__dirname, '..', '..', 'database_export.sql');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found:', dbPath);
    process.exit(1);
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      process.exit(1);
    }
  });

  let sqlOutput = '-- Database Export\n';
  sqlOutput += `-- Generated: ${new Date().toISOString()}\n\n`;
  sqlOutput += 'BEGIN TRANSACTION;\n\n';

  // Get all table names
  db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], (err, tables) => {
    if (err) {
      console.error('❌ Error getting tables:', err);
      db.close();
      process.exit(1);
    }

    if (tables.length === 0) {
      console.log('⚠️  No tables found in database');
      db.close();
      return;
    }

    let processedTables = 0;

    tables.forEach((table) => {
      const tableName = table.name;

      // Get table schema
      db.all(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${tableName}'`, [], (err, schemas) => {
        if (err) {
          console.error(`❌ Error getting schema for ${tableName}:`, err);
          return;
        }

        if (schemas[0] && schemas[0].sql) {
          sqlOutput += `-- Table: ${tableName}\n`;
          sqlOutput += `${schemas[0].sql};\n\n`;
        }

        // Get all data from table
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
          if (err) {
            console.error(`❌ Error getting data from ${tableName}:`, err);
            return;
          }

          if (rows.length > 0) {
            sqlOutput += `-- Data for ${tableName}\n`;
            
            rows.forEach((row) => {
              const columns = Object.keys(row);
              const values = columns.map(col => {
                const value = row[col];
                if (value === null) return 'NULL';
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                return value;
              });

              sqlOutput += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
            });
            sqlOutput += '\n';
          }

          processedTables++;
          if (processedTables === tables.length) {
            sqlOutput += 'COMMIT;\n';
            
            fs.writeFileSync(outputPath, sqlOutput, 'utf8');
            console.log(`✅ Database exported to: ${outputPath}`);
            console.log(`   Tables exported: ${tables.length}`);
            console.log(`   Total rows: ${sqlOutput.split('INSERT INTO').length - 1}`);
            db.close();
            process.exit(0);
          }
        });
      });
    });
  });
};

exportDatabase();

