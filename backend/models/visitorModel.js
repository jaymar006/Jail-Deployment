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

  // Find visitor by name and PDL name (for checking verified_conjugal during QR scan)
  // PDL name can be in format "Last, First Middle" or "Last First Middle"
  findByVisitorAndPdlName: async (visitorName, pdlName) => {
    // Normalize PDL name - remove extra spaces and handle comma format
    const normalizedPdlName = pdlName.trim().replace(/\s+/g, ' ');
    
    // Try to parse PDL name - could be "Last, First Middle" or "Last First Middle"
    let pdlLast = '';
    let pdlFirst = '';
    let pdlMiddle = '';
    
    if (normalizedPdlName.includes(',')) {
      // Format: "Last, First Middle"
      const parts = normalizedPdlName.split(',');
      if (parts.length === 2) {
        pdlLast = parts[0].trim();
        const nameParts = parts[1].trim().split(' ');
        pdlFirst = nameParts[0] || '';
        pdlMiddle = nameParts.slice(1).join(' ') || '';
      }
    } else {
      // Format: "Last First Middle" - assume first word is last name, rest is first+middle
      const nameParts = normalizedPdlName.split(' ');
      if (nameParts.length >= 2) {
        pdlLast = nameParts[0];
        pdlFirst = nameParts[1];
        pdlMiddle = nameParts.slice(2).join(' ') || '';
      }
    }
    
    // Build query based on whether middle name is provided
    let query, params;
    if (pdlMiddle && pdlMiddle.trim()) {
      // Match with middle name
      query = `SELECT v.*, 
                      p.last_name AS pdl_last_name,
                      p.first_name AS pdl_first_name,
                      p.middle_name AS pdl_middle_name
               FROM visitors v
               INNER JOIN pdls p ON v.pdl_id = p.id
               WHERE LOWER(v.name) = LOWER(?)
                 AND LOWER(p.last_name) = LOWER(?)
                 AND LOWER(p.first_name) = LOWER(?)
                 AND (LOWER(COALESCE(p.middle_name, '')) = LOWER(?) OR (p.middle_name IS NULL AND ? = ''))
               LIMIT 1`;
      params = [visitorName, pdlLast, pdlFirst, pdlMiddle.trim(), pdlMiddle.trim()];
    } else {
      // Match without middle name (middle name should be NULL or empty)
      query = `SELECT v.*, 
                      p.last_name AS pdl_last_name,
                      p.first_name AS pdl_first_name,
                      p.middle_name AS pdl_middle_name
               FROM visitors v
               INNER JOIN pdls p ON v.pdl_id = p.id
               WHERE LOWER(v.name) = LOWER(?)
                 AND LOWER(p.last_name) = LOWER(?)
                 AND LOWER(p.first_name) = LOWER(?)
                 AND (p.middle_name IS NULL OR p.middle_name = '' OR TRIM(p.middle_name) = '')
               LIMIT 1`;
      params = [visitorName, pdlLast, pdlFirst];
    }
    
    const [results] = await db.query(query, params);
    return results.length > 0 ? results[0] : null;
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
  verified_conjugal,
  visitor_id: providedVisitorId
} = data;

// If visitor_id is provided (e.g., during import), use it; otherwise generate one
let visitorId = providedVisitorId;

if (!visitorId) {
  // Generate visitor_id in the form VIS-YY-XXXXXX (YY=last two digits of year, X=digit)
  const generateCandidateVisitorId = () => {
    const yearTwoDigits = String(new Date().getFullYear()).slice(2);
    const numericPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    return `VIS-${yearTwoDigits}-${numericPart}`;
  };

  let lastError = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    visitorId = generateCandidateVisitorId();
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
} else {
  // Use provided visitor_id (e.g., from import)
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
    // If duplicate key on visitor_id, throw error (don't auto-generate, user provided it)
    if (err && (err.code === 'ER_DUP_ENTRY' || /duplicate/i.test(err.message))) {
      throw new Error(`Visitor ID ${visitorId} already exists. Please use a different ID or update the existing visitor.`);
    }
    throw err;
  }
}
  },

  update: async (id, data) => {

const {
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number,
  verified_conjugal
} = data;

const [result] = await db.query(
  `UPDATE visitors SET
    name = ?, relationship = ?, age = ?, address = ?, valid_id = ?, date_of_application = ?, contact_number = ?, verified_conjugal = ?
  WHERE id = ?`,
  [name, relationship, age, address, valid_id, date_of_application, contact_number, verified_conjugal !== undefined ? verified_conjugal : 0, id]
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
