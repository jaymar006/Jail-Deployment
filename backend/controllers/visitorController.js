const Visitor = require('../models/visitorModel');
const ScannedVisitor = require('../models/scannedVisitorModel');
const Cell = require('../models/cellModel');

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
    console.error('Failed to format date to application timezone:', error);
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
    console.error('Failed to resolve cell display value:', error);
  }

  return trimmed;
};

exports.getVisitorsByPdl = async (req, res) => {
  try {
    const { pdlId } = req.params;
    const visitors = await Visitor.getAllByPdlId(pdlId);
    res.json(visitors);
  } catch (err) {
    console.error('Error in getVisitorsByPdl:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllVisitorsWithPdlNames = async (req, res) => {
  try {
    const visitors = await Visitor.getAllWithPdlNames();
    res.json(visitors);
  } catch (err) {
    console.error('Error in getAllVisitorsWithPdlNames:', err);
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
    console.error('Error in getVisitorById:', err);
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
  verified_conjugal
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

const insertResult = await Visitor.add(newVisitor);
res.status(201).json({ message: 'Visitor added successfully', id: insertResult.insertId });
  } catch (err) {
    console.error('Error in addVisitor:', err);
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
  contact_number
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
  contact_number
};

await Visitor.update(id, updatedVisitor);
res.json({ message: 'Visitor updated successfully' });
  } catch (err) {
    console.error('Error in updateVisitor:', err);
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
    console.error('Error in deleteVisitor:', err);
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
    console.error('Error in recordScan:', err);
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
    let { visitor_name, pdl_name, cell, relationship, contact_number, device_time, purpose, only_check } = req.body;
    if (!visitor_name || !pdl_name || !cell) {
      return res.status(400).json({ error: 'visitor_name, pdl_name, and cell are required' });
    }

    visitor_name = visitor_name.trim();
    pdl_name = pdl_name.trim();
    const trimmedCell = cell.trim();
    relationship = relationship ? relationship.trim() : null;
    contact_number = contact_number ? contact_number.trim() : null;
    const normalizedPurpose = purpose ? purpose.trim() : 'normal';

    const formattedCell = await resolveCellDisplayValue(trimmedCell);
    const cellCandidates = Array.from(new Set([formattedCell, trimmedCell].filter(Boolean)));

    console.log('addScannedVisitor input:', { visitor_name, pdl_name, cell: formattedCell, relationship, contact_number, normalizedPurpose });

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

    if (only_check) {
      if (openScan && !openScan.time_out) {
        return res.status(200).json({ action: 'time_out' });
      }
      return res.status(200).json({ action: 'time_in_pending' });
    }

    console.log('Found openScan:', openScan);

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
    console.error('Error in addScannedVisitor:', error);
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
    console.error('Error in updateScannedVisitorTimes:', error);
    res.status(500).json({ error: error.message || 'Failed to update scanned visitor times' });
  }
};

exports.deleteScannedVisitor = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting scanned visitor with id:', id);
    const result = await ScannedVisitor.delete(id);
    console.log('Delete result:', result);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Scanned visitor not found' });
    }
    res.json({ message: 'Scanned visitor deleted successfully' });
  } catch (error) {
    console.error('Error in deleteScannedVisitor:', error);
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
    console.error('Error in deleteAllLogs:', error);
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
    console.error('Error in deleteLogsByDateRange:', error);
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
    console.error('Error in deleteLogsByDate:', error);
    res.status(500).json({ error: error.message || 'Failed to delete logs by date' });
  }
};