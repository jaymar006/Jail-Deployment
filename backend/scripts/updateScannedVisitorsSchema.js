const db = require('../config/db');

async function updateScannedVisitorsSchema() {
  try {
    // Add relationship and contact_number columns if they do not exist
    await db.query(`
      ALTER TABLE scanned_visitors
      ADD COLUMN IF NOT EXISTS relationship VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_number VARCHAR(255);
    `);
    console.log('scanned_visitors table schema updated successfully.');
  } catch (error) {
    console.error('Error updating scanned_visitors schema:', error);
  } finally {
    process.exit();
  }
}

updateScannedVisitorsSchema();
