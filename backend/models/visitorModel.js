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

  // Find visitor by exact full name (case-insensitive, trimmed, normalized whitespace)
  // Optionally match by PDL name if provided for more accuracy
  findByExactName: async (visitorName, pdlName = null) => {
    // Normalize visitor name: trim and replace multiple spaces with single space
    const normalizedVisitorName = visitorName.trim().replace(/\s+/g, ' ');
    
    if (pdlName) {
      // If PDL name is provided, use the existing method that matches both
      return await Visitor.findByVisitorAndPdlName(normalizedVisitorName, pdlName);
    } else {
      // If only visitor name is provided, search by exact name match
      // Get all visitors and filter in JavaScript to handle case-insensitive and whitespace normalization
      const [allVisitors] = await db.query('SELECT * FROM visitors');
      
      // Normalize search term: lowercase, trim, normalize whitespace
      const searchTerm = normalizedVisitorName.toLowerCase();
      
      // Filter results with case-insensitive and whitespace-normalized matching
      const exactMatches = allVisitors.filter(v => {
        // Normalize database name: lowercase, trim, normalize whitespace (multiple spaces to single)
        const dbName = (v.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
        return dbName === searchTerm;
      });
      
      // If multiple visitors with same name, return null (ambiguous)
      // If exactly one match, return it
      if (exactMatches.length === 1) {
        return exactMatches[0];
      } else if (exactMatches.length > 1) {
        // Multiple visitors with same name - ambiguous, return null
        return null;
      }
      
      return null;
    }
  },

  // Find visitor by name and PDL name (for checking verified_conjugal during QR scan)
  // PDL name can be in format "Last, First Middle" or "Last First Middle"
  findByVisitorAndPdlName: async (visitorName, pdlName) => {
    // Normalize visitor name - trim and normalize whitespace
    const normalizedVisitorName = visitorName.trim().replace(/\s+/g, ' ');
    
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
        pdlLast = parts[0].trim().replace(/\s+/g, ' ');
        const nameParts = parts[1].trim().replace(/\s+/g, ' ').split(' ');
        pdlFirst = nameParts[0] || '';
        pdlMiddle = nameParts.slice(1).join(' ') || '';
      }
    } else {
      // Format: "Last First Middle" - assume first word is last name, rest is first+middle
      const nameParts = normalizedPdlName.split(' ').filter(p => p.trim());
      if (nameParts.length >= 2) {
        pdlLast = nameParts[0];
        pdlFirst = nameParts[1];
        pdlMiddle = nameParts.slice(2).join(' ') || '';
      }
    }
    
    if (!pdlLast || !pdlFirst) {
      // Invalid PDL name format
      return null;
    }
    
    // Normalize search terms: lowercase and normalize whitespace
    const searchVisitorName = normalizedVisitorName.toLowerCase();
    const searchPdlLast = pdlLast.toLowerCase();
    const searchPdlFirst = pdlFirst.toLowerCase();
    const searchPdlMiddle = pdlMiddle ? pdlMiddle.toLowerCase() : '';
    
    // Get all visitors with their PDLs and filter in JavaScript for case-insensitive and whitespace-normalized matching
    const [allResults] = await db.query(`
      SELECT v.*, 
             p.last_name AS pdl_last_name,
             p.first_name AS pdl_first_name,
             p.middle_name AS pdl_middle_name
      FROM visitors v
      INNER JOIN pdls p ON v.pdl_id = p.id
    `);
    
    // Filter with case-insensitive and whitespace-normalized matching
    const exactMatches = allResults.filter(v => {
      // Normalize visitor name: lowercase, trim, normalize whitespace
      const dbVisitorName = (v.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const dbPdlLast = (v.pdl_last_name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const dbPdlFirst = (v.pdl_first_name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const dbPdlMiddle = (v.pdl_middle_name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      
      // Match visitor name and PDL last/first name
      const visitorNameMatch = dbVisitorName === searchVisitorName;
      const pdlLastMatch = dbPdlLast === searchPdlLast;
      const pdlFirstMatch = dbPdlFirst === searchPdlFirst;
      
      // Match middle name if provided, otherwise check it's empty/null
      let pdlMiddleMatch = true;
      if (searchPdlMiddle) {
        pdlMiddleMatch = dbPdlMiddle === searchPdlMiddle;
      } else {
        // If no middle name in search, database should also have no middle name
        pdlMiddleMatch = !dbPdlMiddle || dbPdlMiddle === '';
      }
      
      return visitorNameMatch && pdlLastMatch && pdlFirstMatch && pdlMiddleMatch;
    });
    
    return exactMatches.length > 0 ? exactMatches[0] : null;
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
