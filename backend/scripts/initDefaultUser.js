const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

/**
 * Initialize default admin user if no users exist in the database
 * This runs on server startup to ensure there's always at least one user
 */
const initDefaultUser = async () => {
  try {
    // Check if any users exist
    const existingUser = await userModel.findUserByUsername('admin');
    
    if (!existingUser) {
      console.log('🔐 No admin user found. Creating default admin user...');
      
      // Hash the default password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create default admin user with empty security questions (can be set later)
      await userModel.createUser(
        'admin',
        hashedPassword,
        '', // security_question_1
        '', // security_answer_1
        '', // security_question_2
        ''  // security_answer_2
      );
      
      console.log('✅ Default admin user created successfully!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  Please change the password after first login!');
    } else {
      console.log('✅ Admin user already exists. Skipping default user creation.');
    }
  } catch (error) {
    console.error('❌ Error initializing default user:', error);
    // Don't throw - allow server to start even if user creation fails
  }
};

module.exports = initDefaultUser;

