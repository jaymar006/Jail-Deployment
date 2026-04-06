const db = require('../config/db');

const VALID_DAY_KEYS = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

const createEmptyWeeklySchedule = () => ({
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
});

const normalizeWeeklySchedule = (input) => {
  const normalized = createEmptyWeeklySchedule();
  if (!input || typeof input !== 'object') return normalized;

  for (const [dayKey, value] of Object.entries(input)) {
    if (!VALID_DAY_KEYS.has(dayKey)) continue;
    const arr = Array.isArray(value) ? value : [];
    normalized[dayKey] = arr
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  // Ensure uniqueness + stable ordering
  for (const key of Object.keys(normalized)) {
    normalized[key] = Array.from(new Set(normalized[key])).sort((a, b) => a - b);
  }

  return normalized;
};

const WeeklySchedule = {
  getWeeklyCellSchedule: async () => {
    const [rows] = await db.query(
      `SELECT day_key, cell_id
       FROM weekly_cell_schedule
       ORDER BY day_key ASC, cell_id ASC`
    );

    const schedule = createEmptyWeeklySchedule();
    for (const row of rows || []) {
      const dayKey = String(row.day_key || '').toLowerCase().trim();
      const cellId = Number(row.cell_id);
      if (!VALID_DAY_KEYS.has(dayKey)) continue;
      if (!Number.isFinite(cellId) || cellId <= 0) continue;
      schedule[dayKey].push(cellId);
    }

    // unique + sort
    for (const key of Object.keys(schedule)) {
      schedule[key] = Array.from(new Set(schedule[key])).sort((a, b) => a - b);
    }

    return schedule;
  },

  replaceWeeklyCellSchedule: async (inputSchedule) => {
    const schedule = normalizeWeeklySchedule(inputSchedule);

    // Best-effort transaction across both SQLite + Postgres
    await db.query('BEGIN');
    try {
      await db.query('DELETE FROM weekly_cell_schedule');

      for (const [dayKey, cellIds] of Object.entries(schedule)) {
        for (const cellId of cellIds) {
          await db.query(
            `INSERT INTO weekly_cell_schedule (day_key, cell_id)
             VALUES (?, ?)`,
            [dayKey, cellId]
          );
        }
      }

      await db.query('COMMIT');
      return schedule;
    } catch (error) {
      try {
        await db.query('ROLLBACK');
      } catch (_) {
        // ignore rollback errors
      }
      throw error;
    }
  },

  normalizeWeeklySchedule
};

module.exports = WeeklySchedule;

