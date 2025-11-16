const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the database file
const dbPath = path.join(__dirname, '..', 'data', 'jail_visitation.sqlite');

console.log('🔄 Removing UNIQUE constraint from cell_number...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Check if the unique constraint exists
db.get("SELECT sql FROM sqlite_master WHERE type='index' AND name='sqlite_autoindex_cells_1'", (err, row) => {
  if (err) {
    console.error('❌ Error checking for unique constraint:', err.message);
    db.close();
    return;
  }

  if (row) {
    console.log('📋 Found unique constraint on cell_number, removing...');
    
    // Create a new table without the unique constraint
    db.serialize(() => {
      // Create new table structure
      db.run(`
        CREATE TABLE cells_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cell_number TEXT NOT NULL,
          cell_name TEXT,
          capacity INTEGER DEFAULT 1,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating new table:', err.message);
          db.close();
          return;
        }
        console.log('✅ Created new cells table structure');
      });

      // Copy data from old table to new table
      db.run(`
        INSERT INTO cells_new (id, cell_number, cell_name, capacity, status, created_at, updated_at)
        SELECT id, cell_number, cell_name, capacity, status, created_at, updated_at
        FROM cells
      `, (err) => {
        if (err) {
          console.error('❌ Error copying data:', err.message);
          db.close();
          return;
        }
        console.log('✅ Copied data to new table');
      });

      // Drop old table
      db.run('DROP TABLE cells', (err) => {
        if (err) {
          console.error('❌ Error dropping old table:', err.message);
          db.close();
          return;
        }
        console.log('✅ Dropped old cells table');
      });

      // Rename new table to original name
      db.run('ALTER TABLE cells_new RENAME TO cells', (err) => {
        if (err) {
          console.error('❌ Error renaming table:', err.message);
          db.close();
          return;
        }
        console.log('✅ Renamed new table to cells');
        console.log('🎉 Successfully removed UNIQUE constraint from cell_number!');
        console.log('📝 You can now create multiple cells with the same cell number');
        db.close();
      });
    });
  } else {
    console.log('✅ No unique constraint found on cell_number');
    console.log('📝 The database is already configured to allow duplicate cell numbers');
    db.close();
  }
});
