const db = require('../config/db');

const updateUsersTableForSecurityQuestions = async () => {
  try {
    // Check if columns already exist by querying table schema
    const columns = await db.query("PRAGMA table_info(users)");
    console.log('Current table structure:', columns);
    
    const hasSecurityColumns = columns.some(col => col.name === 'security_question_1');
    
    if (!hasSecurityColumns) {
      // Add security question columns one by one for SQLite
      await db.query("ALTER TABLE users ADD COLUMN security_question_1 TEXT NOT NULL DEFAULT ''");
      await db.query("ALTER TABLE users ADD COLUMN security_answer_1 TEXT NOT NULL DEFAULT ''");
      await db.query("ALTER TABLE users ADD COLUMN security_question_2 TEXT NOT NULL DEFAULT ''");
      await db.query("ALTER TABLE users ADD COLUMN security_answer_2 TEXT NOT NULL DEFAULT ''");
      console.log('✅ Security question columns added to users table');
    } else {
      console.log('✅ Security question columns already exist');
    }
  } catch (err) {
    console.error('❌ Error updating users table:', err);
  } finally {
    process.exit();
  }
};

updateUsersTableForSecurityQuestions();
