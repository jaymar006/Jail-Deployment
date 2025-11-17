const db = require('../config/db');

const Cell = {
  getAll: async () => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status,
        created_at, updated_at
      FROM cells
      ORDER BY cell_number
    `;
    const [results] = await db.query(sql);
    return results;
  },

  getActive: async () => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status
      FROM cells
      WHERE status = 'active'
      ORDER BY cell_number
    `;
    const [results] = await db.query(sql);
    return results;
  },

  getById: async (id) => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status,
        created_at, updated_at
      FROM cells
      WHERE id = ?
    `;
    const [results] = await db.query(sql, [id]);
    return results.length > 0 ? results[0] : null;
  },

  getByCellNumber: async (cellNumber) => {
    const sql = `
      SELECT 
        id, cell_number, cell_name, capacity, status,
        created_at, updated_at
      FROM cells
      WHERE cell_number = ?
    `;
    const [results] = await db.query(sql, [cellNumber]);
    return results.length > 0 ? results[0] : null;
  },

  add: async (data) => {
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
    const [result] = await db.query(sql, [
      cell_number,
      cell_name || null,
      capacity || 1,
      status || 'active'
    ]);
    return result;
  },

  update: async (id, data) => {
    const {
      cell_number,
      cell_name,
      capacity,
      status
    } = data;

    const sql = `
      UPDATE cells SET
        cell_number = ?, cell_name = ?, capacity = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await db.query(sql, [
      cell_number,
      cell_name || null,
      capacity || 1,
      status || 'active',
      id
    ]);
    return result;
  },

  delete: async (id) => {
    const [result] = await db.query('DELETE FROM cells WHERE id = ?', [id]);
    return result;
  }
};

module.exports = Cell;
