const db = require('../config/db');

const PDL = {
  getAll: () => {
    const sql = `
      SELECT 
        id, first_name, middle_name, last_name, cell_number,
        criminal_case_no, offense_charge, court_branch,
        date(arrest_date) AS arrest_date,
        date(commitment_date) AS commitment_date,
        CASE WHEN first_time_offender = 1 THEN 'Yes' ELSE 'No' END AS first_time_offender
      FROM pdls
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  },

  add: (data) => {
    const {
      first_name,
      middle_name,
      last_name,
      cell_number,
      criminal_case_no,
      offense_charge,
      court_branch,
      arrest_date,
      commitment_date,
      first_time_offender
    } = data;

    const formattedOffender = first_time_offender === 'Yes' ? 1 : 0;

    const sql = `
      INSERT INTO pdls (
        first_name, middle_name, last_name, cell_number,
        criminal_case_no, offense_charge, court_branch,
        arrest_date, commitment_date, first_time_offender
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, [
        first_name,
        middle_name,
        last_name,
        cell_number,
        criminal_case_no,
        offense_charge,
        court_branch,
        arrest_date,
        commitment_date,
        formattedOffender
      ], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  update: (id, data) => {
    const {
      first_name,
      middle_name,
      last_name,
      cell_number,
      criminal_case_no,
      offense_charge,
      court_branch,
      arrest_date,
      commitment_date,
      first_time_offender
    } = data;

    const formattedOffender = first_time_offender === 'Yes' ? 1 : 0;

    const sql = `
      UPDATE pdls SET
        first_name = ?, middle_name = ?, last_name = ?, cell_number = ?,
        criminal_case_no = ?, offense_charge = ?, court_branch = ?,
        arrest_date = ?, commitment_date = ?, first_time_offender = ?
      WHERE id = ?
    `;
    return new Promise((resolve, reject) => {
      db.query(sql, [
        first_name,
        middle_name,
        last_name,
        cell_number,
        criminal_case_no,
        offense_charge,
        court_branch,
        arrest_date,
        commitment_date,
        formattedOffender,
        id
      ], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM pdls WHERE id = ?', [id], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  deleteAll: () => {
    return new Promise((resolve, reject) => {
      db.query('DELETE FROM pdls', (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
};

module.exports = PDL;
