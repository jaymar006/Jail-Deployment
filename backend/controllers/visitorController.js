const Visitor = require('../models/visitorModel');
const ScannedVisitor = require('../models/scannedVisitorModel');
const Cell = require('../models/cellModel');
const PDL = require('../models/pdlModel');
const logger = require('../utils/logger');

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Manila';

const formatToAppTimezone = (input) => {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    const { year, month, day, hour, minute, second } = parts;
    if (!year || !month || !day || !hour || !minute || !second) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (error) {
    logger.error('Failed to format date to application timezone:', error);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
};

const extractCellNumber = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ');
    return parts[parts.length - 1].trim();
  }
  return trimmed;
};

const resolveCellDisplayValue = async (rawCell) => {
  if (!rawCell) return '';
  const trimmed = rawCell.trim();
  if (!trimmed) return '';

  const candidateNumber = extractCellNumber(trimmed);
  try {
    if (candidateNumber) {
      const cellRecord = await Cell.getByCellNumber(candidateNumber);
      if (cellRecord) {
        if (cellRecord.cell_name) {
          return `${cellRecord.cell_name} - ${cellRecord.cell_number}`;
        }
        return cellRecord.cell_number;
      }
    }
  } catch (error) {
    logger.error('Failed to resolve cell display value:', error);
  }

  return trimmed;
};

exports.getVisitorsByPdl = async (req, res) => {
  try {
    const { pdlId } = req.params;
    const visitors = await Visitor.getAllByPdlId(pdlId);
    res.json(visitors);
  } catch (err) {
    logger.error('Error in getVisitorsByPdl:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllVisitorsWithPdlNames = async (req, res) => {
  try {
    const visitors = await Visitor.getAllWithPdlNames();
    res.json(visitors);
  } catch (err) {
    logger.error('Error in getAllVisitorsWithPdlNames:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getVisitorById = async (req, res) => {
  try {
    const { id } = req.params;
    const visitor = await Visitor.getById(id);
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json(visitor);
  } catch (err) {
    logger.error('Error in getVisitorById:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.addVisitor = async (req, res) => {
  try {
    const { pdlId } = req.params;
const {
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number,
  verified_conjugal,
  visitor_id
} = req.body;

if (!name || !relationship || age === undefined || !address || !valid_id || !date_of_application || !contact_number) {
  return res.status(400).json({ error: 'All fields are required' });
}



const newVisitor = {
  pdl_id: pdlId,
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number,
  verified_conjugal
};

// Include visitor_id if provided (e.g., during import)
if (visitor_id) {
  newVisitor.visitor_id = visitor_id.trim();
}

const insertResult = await Visitor.add(newVisitor);
res.status(201).json({ message: 'Visitor added successfully', id: insertResult.insertId });
  } catch (err) {
    logger.error('Error in addVisitor:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateVisitor = async (req, res) => {
  try {
    const { id } = req.params;
const {
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number,
  verified_conjugal
} = req.body;

if (!name || !relationship || age === undefined || !address || !valid_id || !date_of_application || !contact_number) {
  return res.status(400).json({ error: 'All fields are required for update' });
}

const updatedVisitor = {
  name,
  relationship,
  age,
  address,
  valid_id,
  date_of_application,
  contact_number,
  verified_conjugal: verified_conjugal === true || verified_conjugal === 1 || verified_conjugal === 'true' || verified_conjugal === '1' ? 1 : 0
};

await Visitor.update(id, updatedVisitor);
res.json({ message: 'Visitor updated successfully' });
  } catch (err) {
    logger.error('Error in updateVisitor:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Visitor.delete(id);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    res.json({ message: 'Visitor deleted successfully' });
  } catch (err) {
    logger.error('Error in deleteVisitor:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.recordScan = async (req, res) => {
  try {
    const { visitorId } = req.body;
    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    const visitor = await Visitor.getByVisitorId(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    let timeIn = visitor.time_in;
    let timeOut = visitor.time_out;
    const now = new Date();

    if (!timeIn) {
      timeIn = now;
    } else if (!timeOut) {
      timeOut = now;
    } else {
      // Both timeIn and timeOut exist, update timeOut to now
      timeOut = now;
    }

    await Visitor.updateTimeInOut(visitorId, timeIn, timeOut);

    res.json({ message: 'Scan recorded successfully', timeIn, timeOut });
  } catch (err) {
    logger.error('Error in recordScan:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getScannedVisitors = async (req, res) => {
  try {
    const scannedVisitors = await ScannedVisitor.getAll();
    
    // Format timestamps for frontend display
    // PostgreSQL returns TIMESTAMP as Date objects which get serialized to ISO strings
    // We need to ensure they're sent in a format that preserves the local time
    const formattedVisitors = scannedVisitors.map(visitor => ({
      ...visitor,
      time_in: visitor.time_in ? formatTimestampForClient(visitor.time_in) : null,
      time_out: visitor.time_out ? formatTimestampForClient(visitor.time_out) : null,
      scan_date: visitor.scan_date ? formatTimestampForClient(visitor.scan_date) : null
    }));
    
    res.json(formattedVisitors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scanned visitors' });
  }
};

// Helper to format timestamp for client
const formatTimestampForClient = (timestamp) => {
  if (!timestamp) return null;
  
  // If it's already a string in 'YYYY-MM-DD HH:MM:SS' format, return as-is
  if (typeof timestamp === 'string' && timestamp.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
    return timestamp;
  }
  
  // If it's a Date object (from PostgreSQL), format it without timezone conversion
  if (timestamp instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = timestamp.getFullYear();
    const month = pad(timestamp.getMonth() + 1);
    const day = pad(timestamp.getDate());
    const hour = pad(timestamp.getHours());
    const minute = pad(timestamp.getMinutes());
    const second = pad(timestamp.getSeconds());
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
  
  return timestamp;
};

exports.addScannedVisitor = async (req, res) => {
  try {
    // NEW WORKFLOW: Accept only visitor_id, all validation backend-side
    let { visitor_id, device_time, purpose, only_check } = req.body;
    
    // Support legacy format for backward compatibility during transition
    let { visitor_name, pdl_name, cell, relationship, contact_number } = req.body;
    
    // If visitor_id is provided, use new workflow
    if (visitor_id) {
      visitor_id = visitor_id.trim();
      logger.debug('addScannedVisitor (NEW WORKFLOW): visitor_id =', visitor_id);
      
      // Look up visitor from database using visitor_id
      // Supports both new format (VIS-XX-XXXXXX) and old format (numeric primary key id)
      // First try by visitor_id column (for new format like "VIS-1001")
      let visitor = await Visitor.getByVisitorId(visitor_id);
      
      // If not found and visitor_id is numeric, try looking up by primary key id (for old IDs)
      // This ensures backward compatibility with old QR codes that used numeric IDs
      if (!visitor && /^\d+$/.test(visitor_id)) {
        logger.debug('Visitor not found by visitor_id, trying primary key id lookup (old ID format)...');
        const numericId = parseInt(visitor_id, 10);
        visitor = await Visitor.getById(numericId);
        if (visitor) {
          logger.debug('Found visitor using old ID format (primary key id):', numericId);
        }
      }
      
      if (!visitor) {
        logger.debug('Visitor lookup failed for visitor_id:', visitor_id);
        
        // Fallback: If visitor_id not found but visitor_name is available, try to find by exact name
        if (visitor_name && visitor_name.trim()) {
          logger.debug('Attempting fallback lookup by exact visitor name:', visitor_name);
          
          // Try to find visitor by exact name (with optional PDL name for better matching)
          visitor = await Visitor.findByExactName(visitor_name.trim(), pdl_name || null);
          
          if (visitor) {
            logger.debug('Found visitor by exact name fallback:', visitor_name);
          } else {
            logger.debug('Visitor not found by exact name either:', visitor_name);
            return res.status(404).json({ error: `Visitor not found: ${visitor_id}. Also tried searching by name "${visitor_name}" but no match found. Please check the QR code.` });
          }
        } else {
          return res.status(404).json({ error: `Visitor not found: ${visitor_id}. Please check the QR code.` });
        }
      }
      
      // Get PDL information from visitor's pdl_id
      const pdl = await PDL.getById(visitor.pdl_id);
      if (!pdl) {
        return res.status(404).json({ error: 'PDL not found for this visitor' });
      }
      
      // Extract visitor details from database
      visitor_name = visitor.name;
      pdl_name = `${pdl.last_name}, ${pdl.first_name} ${pdl.middle_name || ''}`.trim();
      cell = pdl.cell_number;
      relationship = visitor.relationship;
      contact_number = visitor.contact_number;
      const verifiedConjugal = visitor.verified_conjugal === 1 || visitor.verified_conjugal === true;
      
      logger.debug('addScannedVisitor: Looked up visitor details:', { 
        visitor_name, pdl_name, cell, relationship, contact_number, verifiedConjugal 
      });
      
      // Format cell display value
      const formattedCell = await resolveCellDisplayValue(cell);
      
      // Check latest visit log by visitor_id
      // Use the actual visitor.visitor_id from database (more reliable than input parameter)
      // Also try by visitor.id (primary key) and by visitor name as fallbacks
      logger.debug('Checking for open scan using visitor.visitor_id:', visitor.visitor_id, 'and visitor.id:', visitor.id);
      let openScan = await ScannedVisitor.findOpenScanByVisitorId(visitor.visitor_id);
      if (!openScan && visitor.id) {
        // Fallback: try by primary key id
        logger.debug('No open scan found by visitor_id, trying by primary key id...');
        openScan = await ScannedVisitor.findOpenScanByVisitorId(String(visitor.id));
      }
      // Also try direct lookup by visitor name as additional fallback (most reliable)
      if (!openScan) {
        logger.debug('No open scan found by visitor_id or id, trying by visitor name...');
        openScan = await ScannedVisitor.findOpenScanByVisitorName(visitor_name);
      }
      logger.debug('Final openScan result:', openScan ? `Found open scan ID ${openScan.id}` : 'No open scan found');
      
      if (only_check) {
        if (openScan && !openScan.time_out) {
          return res.status(200).json({ 
            action: 'time_out',
            verified_conjugal: verifiedConjugal,
            visitor_name: visitor_name,
            pdl_name: pdl_name,
            cell: formattedCell
          });
        }
        return res.status(200).json({ 
          action: 'time_in_pending',
          verified_conjugal: verifiedConjugal,
          visitor_name: visitor_name,
          pdl_name: pdl_name,
          cell: formattedCell
        });
      }
      
      // Continue with time_in/time_out logic below...
      const normalizedPurpose = purpose ? purpose.trim() : 'normal';
      
      // Use client-provided device time if valid ISO string; fallback to server time
      let referenceDate = device_time ? new Date(device_time) : new Date();
      if (Number.isNaN(referenceDate.getTime())) {
        referenceDate = new Date();
      }
      let localizedTimestamp = formatToAppTimezone(referenceDate);
      if (!localizedTimestamp) {
        localizedTimestamp = formatToAppTimezone(new Date());
      }

      if (openScan) {
        if (!openScan.time_out) {
          const localTimeOut = localizedTimestamp;
          await ScannedVisitor.updateTimeOut(openScan.id, localTimeOut);
          return res.status(200).json({ 
            message: `Visitor "${visitor_name}" scan timed out`, 
            id: openScan.id, 
            time_out: localTimeOut, 
            action: 'time_out',
            visitor_name: visitor_name,
            pdl_name: pdl_name,
            cell: formattedCell
          });
        } else {
          return res.status(200).json({ 
            message: `Visitor "${visitor_name}" has already timed out`, 
            id: openScan.id, 
            time_out: openScan.time_out, 
            action: 'already_timed_out' 
          });
        }
      } else {
        // No open scan found, create new record
        const scannedVisitorData = {
          visitor_name,
          pdl_name,
          cell: formattedCell,
          time_in: localizedTimestamp,
          time_out: null,
          scan_date: localizedTimestamp,
          relationship,
          contact_number,
          purpose: normalizedPurpose
        };
        const result = await ScannedVisitor.add(scannedVisitorData);
        return res.status(201).json({ 
          message: 'Scanned visitor added', 
          id: result.insertId, 
          time_in: localizedTimestamp, 
          action: 'time_in',
          visitor_name: visitor_name,
          pdl_name: pdl_name,
          cell: formattedCell,
          purpose: normalizedPurpose
        });
      }
    }
    
    // NEW WORKFLOW: If visitor_id is not provided but visitor_name and pdl_name are provided, look up visitor
    if (!visitor_id && visitor_name && pdl_name) {
      logger.debug('addScannedVisitor (NAME-BASED LOOKUP): visitor_name =', visitor_name, 'pdl_name =', pdl_name);
      
      // Look up visitor by name and PDL name
      let visitor = await Visitor.findByVisitorAndPdlName(visitor_name.trim(), pdl_name.trim());
      
      if (!visitor) {
        logger.debug('Visitor lookup failed for visitor_name:', visitor_name, 'pdl_name:', pdl_name);
        return res.status(404).json({ error: `Visitor not found: ${visitor_name} with PDL ${pdl_name}. Please check the QR code.` });
      }
      
      // Get PDL information from visitor's pdl_id
      const pdl = await PDL.getById(visitor.pdl_id);
      if (!pdl) {
        return res.status(404).json({ error: 'PDL not found for this visitor' });
      }
      
      // Extract visitor details from database
      visitor_name = visitor.name;
      pdl_name = `${pdl.last_name}, ${pdl.first_name} ${pdl.middle_name || ''}`.trim();
      const dbCell = pdl.cell_number;
      relationship = visitor.relationship;
      contact_number = visitor.contact_number;
      const verifiedConjugal = visitor.verified_conjugal === 1 || visitor.verified_conjugal === true;
      
      // Use cell from database if not provided in request
      if (!cell) {
        cell = dbCell;
      }
      
      logger.debug('addScannedVisitor: Looked up visitor details by name:', { 
        visitor_name, pdl_name, cell, relationship, contact_number, verifiedConjugal 
      });
      
      // Format cell display value
      const formattedCell = await resolveCellDisplayValue(cell);
      
      // Check latest visit log by visitor_id
      logger.debug('Checking for open scan using visitor.visitor_id:', visitor.visitor_id, 'and visitor.id:', visitor.id);
      let openScan = await ScannedVisitor.findOpenScanByVisitorId(visitor.visitor_id);
      if (!openScan && visitor.id) {
        // Fallback: try by primary key id
        logger.debug('No open scan found by visitor_id, trying by primary key id...');
        openScan = await ScannedVisitor.findOpenScanByVisitorId(String(visitor.id));
      }
      // Also try direct lookup by visitor name as additional fallback (most reliable)
      if (!openScan) {
        logger.debug('No open scan found by visitor_id or id, trying by visitor name...');
        openScan = await ScannedVisitor.findOpenScanByVisitorName(visitor_name);
      }
      logger.debug('Final openScan result:', openScan ? `Found open scan ID ${openScan.id}` : 'No open scan found');
      
      if (only_check) {
        if (openScan && !openScan.time_out) {
          return res.status(200).json({ 
            action: 'time_out',
            verified_conjugal: verifiedConjugal,
            visitor_name: visitor_name,
            pdl_name: pdl_name,
            cell: formattedCell
          });
        }
        return res.status(200).json({ 
          action: 'time_in_pending',
          verified_conjugal: verifiedConjugal,
          visitor_name: visitor_name,
          pdl_name: pdl_name,
          cell: formattedCell
        });
      }
      
      // Continue with time_in/time_out logic below...
      const normalizedPurpose = purpose ? purpose.trim() : 'normal';
      
      // Use client-provided device time if valid ISO string; fallback to server time
      let referenceDate = device_time ? new Date(device_time) : new Date();
      if (Number.isNaN(referenceDate.getTime())) {
        referenceDate = new Date();
      }
      let localizedTimestamp = formatToAppTimezone(referenceDate);
      if (!localizedTimestamp) {
        localizedTimestamp = formatToAppTimezone(new Date());
      }

      if (openScan) {
        if (!openScan.time_out) {
          const localTimeOut = localizedTimestamp;
          await ScannedVisitor.updateTimeOut(openScan.id, localTimeOut);
          return res.status(200).json({ 
            message: `Visitor "${visitor_name}" scan timed out`, 
            id: openScan.id, 
            time_out: localTimeOut, 
            action: 'time_out',
            visitor_name: visitor_name,
            pdl_name: pdl_name,
            cell: formattedCell
          });
        } else {
          return res.status(200).json({ 
            message: `Visitor "${visitor_name}" has already timed out`, 
            id: openScan.id, 
            time_out: openScan.time_out, 
            action: 'already_timed_out' 
          });
        }
      } else {
        // No open scan found, create new record
        const scannedVisitorData = {
          visitor_name,
          pdl_name,
          cell: formattedCell,
          time_in: localizedTimestamp,
          time_out: null,
          scan_date: localizedTimestamp,
          relationship,
          contact_number,
          purpose: normalizedPurpose
        };
        const result = await ScannedVisitor.add(scannedVisitorData);

        return res.status(201).json({ 
          message: 'Scanned visitor added', 
          id: result.insertId, 
          time_in: localizedTimestamp, 
          action: 'time_in',
          visitor_name: visitor_name,
          pdl_name: pdl_name,
          cell: formattedCell
        });
      }
    }
    
    // LEGACY WORKFLOW: Support old format for backward compatibility (requires visitor_name, pdl_name, and cell)
    if (!visitor_name || !pdl_name || !cell) {
      return res.status(400).json({ error: 'visitor_id (or visitor_name and pdl_name, or visitor_name, pdl_name, and cell) is required' });
    }

    visitor_name = visitor_name.trim();
    pdl_name = pdl_name.trim();
    const trimmedCell = cell.trim();
    relationship = relationship ? relationship.trim() : null;
    contact_number = contact_number ? contact_number.trim() : null;
    const normalizedPurpose = purpose ? purpose.trim() : 'normal';

    const formattedCell = await resolveCellDisplayValue(trimmedCell);
    const cellCandidates = Array.from(new Set([formattedCell, trimmedCell].filter(Boolean)));

    logger.debug('addScannedVisitor (LEGACY):', { visitor_name, pdl_name, cell: formattedCell, relationship, contact_number, normalizedPurpose });

    const findOpenScan = async () => {
      for (const candidate of cellCandidates) {
        const existing = await ScannedVisitor.findOpenScanByVisitorDetails(visitor_name, pdl_name, candidate);
        if (existing) {
          return existing;
        }
      }
      return null;
    };

    const openScan = await findOpenScan();

    // Check verified_conjugal status from visitors table
    let verifiedConjugal = false;
    try {
      const visitorRecord = await Visitor.findByVisitorAndPdlName(visitor_name, pdl_name);
      if (visitorRecord) {
        verifiedConjugal = visitorRecord.verified_conjugal === 1 || visitorRecord.verified_conjugal === true;
      }
    } catch (error) {
      logger.error('Error checking verified_conjugal:', error);
      // Continue without verified_conjugal check if it fails
    }

    if (only_check) {
      if (openScan && !openScan.time_out) {
        return res.status(200).json({ 
          action: 'time_out',
          verified_conjugal: verifiedConjugal 
        });
      }
      return res.status(200).json({ 
        action: 'time_in_pending',
        verified_conjugal: verifiedConjugal 
      });
    }

    logger.debug('Found openScan:', openScan);

    // Use client-provided device time if valid ISO string; fallback to server time
    let referenceDate = device_time ? new Date(device_time) : new Date();
    if (Number.isNaN(referenceDate.getTime())) {
      referenceDate = new Date();
    }
    let localizedTimestamp = formatToAppTimezone(referenceDate);
    if (!localizedTimestamp) {
      localizedTimestamp = formatToAppTimezone(new Date());
    }

    if (openScan) {
      if (!openScan.time_out) {
        const localTimeOut = localizedTimestamp;
        await ScannedVisitor.updateTimeOut(openScan.id, localTimeOut);
        return res.status(200).json({ message: `Visitor "${visitor_name}" scan timed out`, id: openScan.id, time_out: localTimeOut, action: 'time_out' });
      } else {
        return res.status(200).json({ message: `Visitor "${visitor_name}" has already timed out`, id: openScan.id, time_out: openScan.time_out, action: 'already_timed_out' });
      }
    } else {
      // CRITICAL: Double-check for openScan before creating new record (race condition fix)
      // This prevents duplicate records when multiple requests come in simultaneously
      logger.debug('⚠️ No openScan found on first check - performing double-check to prevent race condition...');
      const doubleCheckOpenScan = await findOpenScan();
      if (doubleCheckOpenScan) {
        logger.debug('✅ Double-check found openScan - another request may have created it. Updating instead of creating new record.');
        // Another request just created this record, update it instead
        if (!doubleCheckOpenScan.time_out) {
          const localTimeOut = localizedTimestamp;
          await ScannedVisitor.updateTimeOut(doubleCheckOpenScan.id, localTimeOut);
          return res.status(200).json({ message: `Visitor "${visitor_name}" scan timed out`, id: doubleCheckOpenScan.id, time_out: localTimeOut, action: 'time_out' });
        } else {
          return res.status(200).json({ message: `Visitor "${visitor_name}" has already timed out`, id: doubleCheckOpenScan.id, time_out: doubleCheckOpenScan.time_out, action: 'already_timed_out' });
        }
      }
      // Additional safeguard: Check for very recently created records (within last 5 seconds)
      // This catches race conditions where a record was just created but not yet visible in the first check
      const recentScan = await ScannedVisitor.findRecentScanByVisitorDetails(visitor_name, pdl_name, formattedCell, 5);
      if (recentScan && !recentScan.time_out) {
        // Found a recent open scan - this is likely a time_out request that didn't find the openScan due to race condition
        logger.warn('⚠️ Found recent open scan created within last 5 seconds - treating as time_out to prevent duplicate');
        const localTimeOut = localizedTimestamp;
        await ScannedVisitor.updateTimeOut(recentScan.id, localTimeOut);
        return res.status(200).json({ message: `Visitor "${visitor_name}" scan timed out`, id: recentScan.id, time_out: localTimeOut, action: 'time_out' });
      }
      
      if (recentScan && recentScan.time_out) {
        // Recent scan already timed out - this is a new time_in, safe to create
        logger.debug('✅ Recent scan already timed out - creating new time_in record');
      }

      logger.debug('✅ All checks passed - safe to create new record');

      // No open scan found, create new record
      const scannedVisitorData = {
        visitor_name,
        pdl_name,
        cell: formattedCell,
        time_in: localizedTimestamp,
        time_out: null,
        scan_date: localizedTimestamp,
        relationship,
        contact_number,
        purpose: normalizedPurpose
      };
      const result = await ScannedVisitor.add(scannedVisitorData);

      return res.status(201).json({ message: 'Scanned visitor added', id: result.insertId, time_in: localizedTimestamp, action: 'time_in' });
    }
  } catch (error) {
    logger.error('Error in addScannedVisitor:', error);
    res.status(500).json({ error: error.message || 'Failed to add scanned visitor' });
  }
};

exports.updateScannedVisitorTimes = async (req, res) => {
  try {
    const { id } = req.params;
    const { time_in, time_out } = req.body;

    if (!time_in || !time_out) {
      return res.status(400).json({ error: 'time_in and time_out are required' });
    }

    const normalizedTimeIn = formatToAppTimezone(new Date(time_in));
    const normalizedTimeOut = formatToAppTimezone(new Date(time_out));

    if (!normalizedTimeIn || !normalizedTimeOut) {
      return res.status(400).json({ error: 'Invalid time format' });
    }

    await ScannedVisitor.updateTimes(id, normalizedTimeIn, normalizedTimeOut);

    res.json({ message: 'Scanned visitor times updated successfully' });
  } catch (error) {
    logger.error('Error in updateScannedVisitorTimes:', error);
    res.status(500).json({ error: error.message || 'Failed to update scanned visitor times' });
  }
};

exports.deleteScannedVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    logger.debug('Deleting scanned visitor with id:', id);
    const result = await ScannedVisitor.delete(id);
    logger.debug('Delete result:', result);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Scanned visitor not found' });
    }
    res.json({ message: 'Scanned visitor deleted successfully' });
  } catch (error) {
    logger.error('Error in deleteScannedVisitor:', error);
    res.status(500).json({ error: error.message || 'Failed to delete scanned visitor' });
  }
};

exports.deleteAllLogs = async (req, res) => {
  try {
    const result = await ScannedVisitor.deleteAll();
    res.json({ 
      message: 'All logs deleted successfully',
      deletedCount: result.affectedRows 
    });
  } catch (error) {
    logger.error('Error in deleteAllLogs:', error);
    res.status(500).json({ error: error.message || 'Failed to delete all logs' });
  }
};

exports.deleteLogsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const result = await ScannedVisitor.deleteByDateRange(startDate, endDate);
    res.json({ 
      message: 'Logs deleted successfully for the specified date range',
      deletedCount: result.affectedRows,
      startDate,
      endDate
    });
  } catch (error) {
    logger.error('Error in deleteLogsByDateRange:', error);
    res.status(500).json({ error: error.message || 'Failed to delete logs by date range' });
  }
};

exports.deleteLogsByDate = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const result = await ScannedVisitor.deleteByDate(date);
    res.json({ 
      message: 'Logs deleted successfully for the specified date',
      deletedCount: result.affectedRows,
      date
    });
  } catch (error) {
    logger.error('Error in deleteLogsByDate:', error);
    res.status(500).json({ error: error.message || 'Failed to delete logs by date' });
  }
};