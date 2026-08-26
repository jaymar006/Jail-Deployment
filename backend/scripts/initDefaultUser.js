const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

/**
 * Initialize default admin user if no users exist in the database.
 * Runs on server startup to ensure there's always at least one admin.
 *
 * Security: the default admin is ONLY created when ADMIN_PASSWORD is set in
 * the environment. No hardcoded credentials are ever used.
 */
const initDefaultUser = async () => {
  try {
    // Check if any users exist
    const existingUser = await userModel.findUserByUsername('admin');

    if (existingUser) {
      console.log('✅ Admin user already exists. Skipping default user creation.');
      return;
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.warn('⚠️  No users exist and ADMIN_PASSWORD is not set.');
      console.warn('⚠️  Skipping default admin creation. Set ADMIN_PASSWORD (and optionally ADMIN_USERNAME) in the environment to create one.');
      return;
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || '';

    console.log('🔐 No admin user found. Creating default admin user...');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await userModel.createUser(
      adminUsername,
      hashedPassword,
      '',
      'admin',
      adminEmail
    );

    console.log(`✅ Default admin user created successfully!`);
    console.log(`   Username: ${adminUsername}`);
    console.log('   ⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('❌ Error initializing default user:', error);
    // Don't throw - allow server to start even if user creation fails
  }
};

module.exports = initDefaultUser;
