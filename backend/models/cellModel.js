const db = require('../config/db');

const Cell = {
  getAll: () => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status,
        created_at, updated_at
      FROM cells
      ORDER BY cell_number
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  getActive: () => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status
      FROM cells
      WHERE status = 'active'
      ORDER BY cell_number
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  getById: (id) => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status,
        created_at, updated_at
      FROM cells
      WHERE id = ?
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, [id], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  getByCellNumber: (cellNumber) => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status,
        created_at, updated_at
      FROM cells
      WHERE cell_number = ?
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, [cellNumber], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0 ? results[0] : null);
      });
    });
  },

  add: (data) => {
    const {
      cell_number,
      cell_name,
      capacity,
      status
    } = data;

    const sql = `
      INSERT INTO cells (
        cell_number, cell_name, capacity, status
      ) VALUES (?, ?, ?, ?)
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, [
        cell_number,
        cell_name || null,
        capacity || 1,
        status || 'active'
      ], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  update: (id, data) => {
    const {
      cell_number,
      cell_name,
      capacity,
      status
    } = data;

    const sql = `
      UPDATE cells SET
        cell_number = ?, cell_name = ?, capacity = ?, status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, [
        cell_number,
        cell_name || null,
        capacity || 1,
        status || 'active',
        id
      ], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM cells WHERE id = ?', [id], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
};

module.exports = Cell;
