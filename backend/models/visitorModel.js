const db = require('../config/db');

const Visitor = {
  getAllByPdlId: async (pdlId) => {
    const [results] = await db.query('SELECT * FROM visitors WHERE pdl_id = ?', [pdlId]);
    return results;
  },

  getAllWithPdlNames: async () => {
    const [results] = await db.query(
      `SELECT visitors.*, pdls.last_name AS pdl_last_name, pdls.first_name AS pdl_first_name, pdls.middle_name AS pdl_middle_name
       FROM visitors
       LEFT JOIN pdls ON visitors.pdl_id = pdls.id`
    );
    return results;
  },

  getById: async (id) => {
    const [results] = await db.query('SELECT * FROM visitors WHERE id = ?', [id]);
    return results[0];
  },

  getByVisitorId: async (visitorId) => {
    const [results] = await db.query('SELECT * FROM visitors WHERE visitor_id = ?', [visitorId]);
    return results[0];
  },

  countByPdlId: async (pdlId) => {
    const [results] = await db.query('SELECT COUNT(*) AS count FROM visitors WHERE pdl_id = ?', [pdlId]);
    return results[0].count;
  },

  add: async (data) => {

const {
  pdl_id,
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number,
  verified_conjugal
} = data;

// Generate visitor_id in the form VIS-YY-XXXXXX (YY=last two digits of year, X=digit)
const generateCandidateVisitorId = () => {
  const yearTwoDigits = String(new Date().getFullYear()).slice(2);
  const numericPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `VIS-${yearTwoDigits}-${numericPart}`;
};

let lastError = null;
for (let attempt = 0; attempt < 10; attempt++) {
  const visitorId = generateCandidateVisitorId();
  try {
    const [result] = await db.query(
      `INSERT INTO visitors (
        pdl_id, visitor_id, name, relationship, age, address, valid_id, date_of_application, contact_number, verified_conjugal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ,
      [pdl_id, visitorId, name, relationship, age, address, valid_id, date_of_application, contact_number, verified_conjugal ? 1 : 0]
    );
    return result;
  } catch (err) {
    // If duplicate key on visitor_id, retry with a new id; otherwise, rethrow
    if (err && (err.code === 'ER_DUP_ENTRY' || /duplicate/i.test(err.message))) {
      lastError = err;
      continue;
    }
    throw err;
  }
}

// If we somehow exhaust retries, throw the last duplicate error
throw lastError || new Error('Failed to generate unique visitor_id');
  },

  update: async (id, data) => {

const {
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number
} = data;

const [result] = await db.query(
  `UPDATE visitors SET
    name = ?, relationship = ?, age = ?, address = ?, valid_id = ?, date_of_application = ?, contact_number = ?
  WHERE id = ?`,
  [name, relationship, age, address, valid_id, date_of_application, contact_number, id]
);
return result;
  },

  delete: async (id) => {
    const [result] = await db.query('DELETE FROM visitors WHERE id = ?', [id]);
    return result;
  },

  updateTimeInOut: async (visitorId, timeIn, timeOut) => {
    const [result] = await db.query(
      `UPDATE visitors SET time_in = ?, time_out = ? WHERE visitor_id = ?`,
      [timeIn, timeOut, visitorId]
    );
    return result;
  }
};

module.exports = Visitor;
