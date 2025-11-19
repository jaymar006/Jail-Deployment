const db = require('../config/db');

const makeCodeUnlimited = async (code) => {
  try {
    // Check if code exists
    const [existing] = await db.query(
      'SELECT * FROM registration_codes WHERE code = ?',
      [code]
    );

    if (existing.length === 0) {
      // Create new unlimited code
      await db.query(
        'INSERT INTO registration_codes (code, expires_at, use_limit, used_count) VALUES (?, NULL, NULL, 0)',
        [code]
      );
      console.log(`✅ Created unlimited registration code: ${code}`);
    } else {
      // Update existing code to unlimited
      await db.query(
        'UPDATE registration_codes SET expires_at = NULL, use_limit = NULL, is_used = 0 WHERE code = ?',
        [code]
      );
      console.log(`✅ Updated registration code to unlimited: ${code}`);
    }

    // Verify the update
    const [updated] = await db.query(
      'SELECT code, expires_at, use_limit, used_count, is_used FROM registration_codes WHERE code = ?',
      [code]
    );
    
    if (updated.length > 0) {
      const codeData = updated[0];
      console.log('\n📋 Code Details:');
      console.log(`   Code: ${codeData.code}`);
      console.log(`   Expires: ${codeData.expires_at ? codeData.expires_at : 'Never (Unlimited)'}`);
      console.log(`   Use Limit: ${codeData.use_limit !== null ? codeData.use_limit : 'Unlimited'}`);
      console.log(`   Used Count: ${codeData.used_count || 0}`);
      console.log(`   Is Used: ${codeData.is_used ? 'Yes' : 'No'}`);
    }
  } catch (err) {
    console.error('❌ Error updating registration code:', err);
    throw err;
  } finally {
    process.exit();
  }
};

// Get code from command line argument or use SCJS2025 as default
const code = process.argv[2] || 'SCJS2025';
makeCodeUnlimited(code);

