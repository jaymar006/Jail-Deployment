const db = require('../config/db');

const ScannedVisitor = {
  getAll: async () => {
    const [results] = await db.query('SELECT * FROM scanned_visitors ORDER BY scan_date DESC');
    return results;
  },

  findOpenScanByVisitorName: async (visitor_name) => {
    const [results] = await db.query(
      `SELECT * FROM scanned_visitors WHERE visitor_name = ? AND time_out IS NULL ORDER BY scan_date DESC LIMIT 1`,
      [visitor_name]
    );
    return results.length > 0 ? results[0] : null;
  },

  findOpenScanByVisitorDetails: async (visitor_name, pdl_name, cell) => {
    console.log('findOpenScanByVisitorDetails called with:', visitor_name, pdl_name, cell);
    const [results] = await db.query(
      `SELECT * FROM scanned_visitors WHERE visitor_name = ? AND pdl_name = ? AND cell = ? AND time_out IS NULL ORDER BY scan_date DESC LIMIT 1`,
      [visitor_name, pdl_name, cell]
    );
    console.log('findOpenScanByVisitorDetails results:', results);
    return results.length > 0 ? results[0] : null;
  },

  updateTimeOut: async (id, time_out) => {
    console.log('updateTimeOut called with:', id, time_out);
    const [result] = await db.query(
      `UPDATE scanned_visitors SET time_out = ? WHERE id = ?`,
      [time_out, id]
    );
    console.log('updateTimeOut result:', result);
    return result;
  },

  add: async (data) => {
    const {
      visitor_name,
      pdl_name,
      cell,
      time_in,
      time_out,
      scan_date,
      relationship,
      contact_number,
      purpose
    } = data;

    const [result] = await db.query(
      `INSERT INTO scanned_visitors (
        visitor_name, pdl_name, cell, time_in, time_out, scan_date, relationship, contact_number, purpose
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [visitor_name, pdl_name, cell, time_in, time_out, scan_date, relationship, contact_number, purpose]
    );
    return result;
  },

  updateTimes: async (id, time_in, time_out) => {
    console.log('updateTimes called with:', id, time_in, time_out);
    const [result] = await db.query(
      `UPDATE scanned_visitors SET time_in = ?, time_out = ? WHERE id = ?`,
      [time_in, time_out, id]
    );
    console.log('updateTimes result:', result);
    return result;
  },

  delete: async (id) => {
    console.log('delete called with id:', id);
    const [result] = await db.query(
      `DELETE FROM scanned_visitors WHERE id = ?`,
      [id]
    );
    console.log('delete result:', result);
    return result;
  },

  deleteAll: async () => {
    console.log('deleteAll called');
    const [result] = await db.query('DELETE FROM scanned_visitors');
    console.log('deleteAll result:', result);
    return result;
  },

  deleteByDateRange: async (startDate, endDate) => {
    console.log('deleteByDateRange called with:', startDate, endDate);
    const [result] = await db.query(
      `DELETE FROM scanned_visitors WHERE scan_date >= ? AND scan_date <= ?`,
      [startDate, endDate]
    );
    console.log('deleteByDateRange result:', result);
    return result;
  },

  deleteByDate: async (date) => {
    console.log('deleteByDate called with:', date);
    const [result] = await db.query(
      `DELETE FROM scanned_visitors WHERE DATE(scan_date) = ?`,
      [date]
    );
    console.log('deleteByDate result:', result);
    return result;
  }
};

ScannedVisitor.updateTimeInOutToCreatedUpdated = async (id) => {
  return null;
};

module.exports = ScannedVisitor;
