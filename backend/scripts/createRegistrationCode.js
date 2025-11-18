const db = require('../config/db');
const crypto = require('crypto');

// Script to create a registration code
// Usage: node backend/scripts/createRegistrationCode.js [code] [days-valid]
// If no code provided, generates a random one
// If no days provided, defaults to 90 days

const createRegistrationCode = async () => {
  try {
    const args = process.argv.slice(2);
    let code = args[0];
    const daysValid = args[1] ? parseInt(args[1]) : 90;
    
    if (!code) {
      // Generate a random 8-character code
      code = crypto.randomBytes(4).toString('hex').toUpperCase();
      console.log(`Generated registration code: ${code}`);
    }
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysValid);
    
    await db.query(
      `INSERT INTO registration_codes (code, expires_at) VALUES (?, ?)`,
      [code, expiresAt]
    );
    
    console.log(`✅ Registration code created successfully!`);
    console.log(`   Code: ${code}`);
    console.log(`   Expires: ${expiresAt.toLocaleDateString()}`);
    console.log(`   Valid for: ${daysValid} days`);
    
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY' || err.message.includes('UNIQUE constraint')) {
      console.error('❌ Error: Registration code already exists');
    } else if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      console.error('❌ Error: registration_codes table does not exist. Please run createSecurityTables.js first.');
    } else {
      console.error('❌ Error creating registration code:', err.message);
    }
  } finally {
    process.exit();
  }
};

createRegistrationCode();

