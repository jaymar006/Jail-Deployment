const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const sqlFilePath = path.join(__dirname, '../../jail_visitation_database.sql');

const initDatabase = async () => {
  try {
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    const statements = sql.split(/;\s*$/m);

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

initDatabase();
