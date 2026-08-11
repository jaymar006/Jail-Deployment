const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const backupService = require('../services/backupService');
const logger = require('../utils/logger');

async function test() {
  logger.info('🚀 Starting manual database backup and cleanup test...');
  try {
    const report = await backupService.runScheduledBackup();
    logger.info('✅ Manual Test Completed Successfully!');
    console.log('\n--- Backup Report ---');
    console.log(JSON.stringify(report, null, 2));
    console.log('---------------------\n');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Manual Test Failed:', error.stack || error.message);
    process.exit(1);
  }
}

test();
