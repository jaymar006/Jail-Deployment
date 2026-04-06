const WeeklySchedule = require('../models/weeklyScheduleModel');
const logger = require('../utils/logger');

exports.getWeeklyCellSchedule = async (req, res) => {
  try {
    const schedule = await WeeklySchedule.getWeeklyCellSchedule();
    res.json({ schedule });
  } catch (error) {
    logger.error('Error fetching weekly cell schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch weekly schedule' });
  }
};

exports.replaceWeeklyCellSchedule = async (req, res) => {
  try {
    const input = req.body?.schedule;
    const saved = await WeeklySchedule.replaceWeeklyCellSchedule(input);
    res.json({ schedule: saved });
  } catch (error) {
    logger.error('Error saving weekly cell schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to save weekly schedule' });
  }
};

