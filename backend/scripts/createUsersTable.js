const db = require('../config/db');

const createUsersTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        security_question_1 VARCHAR(500) NOT NULL,
        security_answer_1 VARCHAR(255) NOT NULL,
        security_question_2 VARCHAR(500) NOT NULL,
        security_answer_2 VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await db.query(query);
    console.log('✅ users table created or already exists');
  } catch (err) {
    console.error('❌ Error creating users table:', err);
  } finally {
    process.exit();
  }
};

createUsersTable();
