const db = require('../config/db');

// Script to list all registration codes
// Usage: node backend/scripts/listRegistrationCodes.js

const listRegistrationCodes = async () => {
  try {
    const [rows] = await db.query(
      `SELECT code, is_used, created_at, expires_at, used_at 
       FROM registration_codes 
       ORDER BY created_at DESC`
    );
    
    if (rows.length === 0) {
      console.log('📋 No registration codes found.');
      console.log('💡 Create one with: node backend/scripts/createRegistrationCode.js');
      return;
    }
    
    console.log('\n📋 Registration Codes:\n');
    console.log('─'.repeat(80));
    
    rows.forEach((row, index) => {
      const isUsed = row.is_used === 1 || row.is_used === true;
      const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
      const usedAt = row.used_at ? new Date(row.used_at) : null;
      const now = new Date();
      
      let status = '✅ Available';
      if (isUsed) {
        status = '❌ Used';
      } else if (expiresAt && expiresAt < now) {
        status = '⏰ Expired';
      }
      
      console.log(`\n${index + 1}. Code: ${row.code}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${new Date(row.created_at).toLocaleString()}`);
      
      if (expiresAt) {
        const isExpired = expiresAt < now;
        console.log(`   Expires: ${expiresAt.toLocaleString()} ${isExpired ? '(EXPIRED)' : ''}`);
      } else {
        console.log(`   Expires: Never`);
      }
      
      if (usedAt) {
        console.log(`   Used At: ${usedAt.toLocaleString()}`);
      }
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log(`\nTotal: ${rows.length} code(s)`);
    
    const available = rows.filter(r => {
      const isUsed = r.is_used === 1 || r.is_used === true;
      const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
      const now = new Date();
      return !isUsed && (!expiresAt || expiresAt > now);
    });
    
    if (available.length > 0) {
      console.log(`Available: ${available.length} code(s)`);
      console.log('\n💡 Available codes you can use:');
      available.forEach(row => {
        console.log(`   - ${row.code}`);
      });
    }
    
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === '42P01') {
      console.error('❌ Error: registration_codes table does not exist.');
      console.log('💡 Run: node backend/scripts/createSecurityTables.js');
    } else {
      console.error('❌ Error listing registration codes:', err.message);
    }
  } finally {
    process.exit();
  }
};

listRegistrationCodes();

