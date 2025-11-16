const db = require('../config/db');

async function updateTimeInOutForAll() {
  try {
    const [result] = await db.query(
      `UPDATE scanned_visitors
       SET time_in = created_at,
           time_out = updated_at
       WHERE time_in IS NULL OR time_out IS NULL OR time_in != created_at OR time_out != updated_at`
    );
    console.log(`Updated ${result.affectedRows} rows in scanned_visitors.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating scanned_visitors time_in and time_out:', error);
    process.exit(1);
  }
}

updateTimeInOutForAll();
