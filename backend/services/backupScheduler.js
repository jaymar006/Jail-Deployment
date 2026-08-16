const cron = require('node-cron');
const db = require('../config/db');
const logger = require('../utils/logger');
const backupService = require('./backupService');

const SETTINGS_KEY = 'backup_frequency';

// frequency key -> cron expression (server local time)
const FREQUENCIES = {
  off: null,
  every_6_hours: '0 */6 * * *',
  every_12_hours: '0 */12 * * *',
  daily: '0 0 * * *',
  weekly: '0 0 * * 0',
  monthly: '0 0 1 * *',
};

const VALID_FREQUENCIES = Object.keys(FREQUENCIES);

let scheduledJob = null;

const getBackupFrequency = async () => {
  try {
    const rows = await db.query(
      `SELECT value FROM settings WHERE key = ?`,
      [SETTINGS_KEY]
    );
    const value = rows[0] && rows[0][0] ? rows[0][0].value : null;
    return VALID_FREQUENCIES.includes(value) ? value : 'daily';
  } catch (err) {
    logger.warn(`⚠️ Could not read backup frequency, defaulting to daily: ${err.message}`);
    return 'daily';
  }
};

const setBackupFrequency = async (frequency) => {
  if (!VALID_FREQUENCIES.includes(frequency)) {
    throw new Error(`Invalid backup frequency: ${frequency}`);
  }
  await db.query(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SETTINGS_KEY, frequency]
  );
};

const cancelScheduledJob = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
};

const runBackup = async () => {
  try {
    logger.info('⏰ Starting scheduled database backup...');
    const report = await backupService.runScheduledBackup();
    logger.info(`✅ Scheduled backup completed successfully: ${report.backupFile}`);
  } catch (error) {
    logger.error('❌ Scheduled backup failed:', error.message);
  }
};

const scheduleBackup = async () => {
  cancelScheduledJob();

  const frequency = await getBackupFrequency();
  const expression = FREQUENCIES[frequency];

  if (!expression) {
    logger.info('🔕 Automatic backup is disabled.');
    return;
  }

  scheduledJob = cron.schedule(expression, runBackup);
  logger.info(`⏰ Automatic database backup scheduled (${frequency}) -> cron "${expression}"`);
};

const start = async () => {
  try {
    await scheduleBackup();
  } catch (err) {
    logger.error('❌ Failed to schedule automatic backup:', err.message);
  }
};

module.exports = {
  FREQUENCIES,
  VALID_FREQUENCIES,
  getBackupFrequency,
  setBackupFrequency,
  scheduleBackup,
  start,
};
