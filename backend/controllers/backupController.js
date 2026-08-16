const backupService = require('../services/backupService');
const backupScheduler = require('../services/backupScheduler');

const runManualBackup = async (req, res) => {
  try {
    const result = await backupService.runManualBackup();
    res.json(result);
  } catch (err) {
    console.error('❌ Manual backup failed:', err.message);
    res.status(500).json({ error: err.message });
  }
};

const getBackupSettings = async (req, res) => {
  try {
    const frequency = await backupScheduler.getBackupFrequency();
    res.json({ frequency });
  } catch (err) {
    console.error('❌ Failed to get backup settings:', err.message);
    res.status(500).json({ error: err.message });
  }
};

const updateBackupSettings = async (req, res) => {
  try {
    const { frequency } = req.body || {};
    if (!backupScheduler.VALID_FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ error: `Invalid frequency. Must be one of: ${backupScheduler.VALID_FREQUENCIES.join(', ')}` });
    }
    await backupScheduler.setBackupFrequency(frequency);
    await backupScheduler.scheduleBackup();
    res.json({ frequency });
  } catch (err) {
    console.error('❌ Failed to update backup settings:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { runManualBackup, getBackupSettings, updateBackupSettings };
