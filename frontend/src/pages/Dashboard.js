import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import QRCodeScanner from '../components/QRCodeScanner';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import logger from '../utils/logger';
import './Dashboard.css';

const Modal = ({ children, onClose }) => {
  // Prevent body scroll when modal is open and ensure overlay covers everything
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBgColor = document.body.style.backgroundColor;
    const originalHtmlBgColor = document.documentElement.style.backgroundColor;
    
    // Prevent scrolling on both body and html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Ensure background doesn't show white behind modal
    document.body.style.backgroundColor = '#f9fafb';
    document.documentElement.style.backgroundColor = '#f9fafb';
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.backgroundColor = originalBgColor;
      document.documentElement.style.backgroundColor = originalHtmlBgColor;
    };
  }, []);

  // Render modal at document body level to ensure it covers everything
  return ReactDOM.createPortal(
    <div className="common-modal" onClick={onClose}>
      <div className="common-modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

const Dashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [resetTrigger] = useState(0);

  const [selectedVisitorId, setSelectedVisitorId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTimeIn, setEditTimeIn] = useState('');
  const [editTimeOut, setEditTimeOut] = useState('');
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [pendingScanData, setPendingScanData] = useState(null);
  const [verifiedConjugal, setVerifiedConjugal] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState({ type: '', message: '', visitorData: null });
  const [lockoutUntil, setLockoutUntil] = useState(null); // Timestamp when lockout expires
  const [lockoutMessage, setLockoutMessage] = useState('');
  const [lastTimeOutAt, setLastTimeOutAt] = useState(null); // Track when last time-out occurred to prevent immediate re-scans

  // Prevent body scroll when success modal is open
  useEffect(() => {
    if (showSuccessModal) {
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [showSuccessModal]);

  // Update lockout message countdown
  useEffect(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutMessage(`Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before scanning again.`);
        } else {
          setLockoutUntil(null);
          setLockoutMessage('');
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);
  const [lastScanSig, setLastScanSig] = useState(null);
  const [lastScanAt, setLastScanAt] = useState(0);
  const isProcessingScanRef = useRef(false); // Synchronous ref to prevent concurrent scans
  const [selectedDeleteIds, setSelectedDeleteIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth <= 480);
  const [availableCells, setAvailableCells] = useState([]);
  const [cellsLoaded, setCellsLoaded] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDuration, setScheduleDuration] = useState(() => {
    const saved = localStorage.getItem('scheduleDuration');
    return saved !== null ? parseInt(saved, 10) : 12; // Default 12 hours
  });
  const [scheduledCells, setScheduledCells] = useState(() => {
    // Load scheduled cells from localStorage on mount
    try {
      const saved = localStorage.getItem('scheduledCells');
      if (saved) {
        const data = JSON.parse(saved);
        const savedDuration = localStorage.getItem('scheduleDuration');
        const duration = savedDuration !== null ? parseInt(savedDuration, 10) : 12;
        
        // Normalize IDs to numbers (Set uses strict equality, so type matters)
        const normalizedIds = (data.cellIds || []).map(id => Number(id));
        
        // Check if schedule is still valid
        if (duration === -1) {
          // Indefinitely - always valid
          return new Set(normalizedIds);
        } else {
          // Check if within duration
          const now = Date.now();
          const elapsed = (now - data.timestamp) / (1000 * 60 * 60); // hours
          if (elapsed < duration) {
            return new Set(normalizedIds);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading scheduled cells:', error);
    }
    return new Set();
  });
  const [qrUploadEnabled, setQrUploadEnabled] = useState(() => {
    const saved = localStorage.getItem('qrUploadEnabled');
    return saved !== null ? saved === 'true' : true; // Default to enabled
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const fileInputRef = useRef(null);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    // Backend sends timestamps in 'YYYY-MM-DD HH:MM:SS' format (Asia/Manila timezone)
    // Simply extract and display the time portion
    const dateStr = String(timestamp).trim();
    
    // Extract time portion (HH:MM:SS) from 'YYYY-MM-DD HH:MM:SS' format
    if (dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      if (parts.length >= 2) {
        return parts[1].substring(0, 8); // Return HH:MM:SS
      }
    }
    
    // Fallback: if timestamp is in different format
    return dateStr;
  };


  const toInputTimeHHMMSS = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const capitalizeWords = (str) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getDateString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  };

  const currentDateString = getDateString(new Date().toISOString());

  const showToast = useCallback((message, type = 'success') => {
    logger.debug('showToast called:', { message, type, timestamp: new Date().toISOString() });
    logger.debug('Current toast state before update:', toast);
    
    setToast({ show: true, message, type });
    
    if (type === 'error') {
      logger.error('ERROR TOAST:', message);
    }
    
    setTimeout(() => {
      logger.debug('Toast hiding after 4 seconds');
      setToast({ show: false, message: '', type: '' });
    }, 4000); // Increased to 4 seconds for better visibility
  }, [toast]);

  const fetchVisitors = useCallback(async () => {
    try {
      const res = await api.get('/api/scanned_visitors');
      setVisitors(res.data);
    } catch (error) {
      logger.error('Failed to fetch visitors:', error);
      showToast('Failed to fetch visitors data', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsSmallMobile(window.innerWidth <= 480);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchVisitors();
    fetchAvailableCells();
  }, [fetchVisitors]);

  // Listen for changes to QR upload setting and schedule duration from Settings page
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'qrUploadEnabled') {
        setQrUploadEnabled(e.newValue === 'true');
      } else if (e.key === 'scheduleDuration') {
        const newDuration = e.newValue !== null ? parseInt(e.newValue, 10) : 12;
        setScheduleDuration(newDuration);
        
        // Validate current scheduled cells against new duration
        try {
          const saved = localStorage.getItem('scheduledCells');
          if (saved) {
            const data = JSON.parse(saved);
            if (newDuration === -1) {
              // Indefinitely - keep all (normalize IDs to numbers)
              const normalizedIds = (data.cellIds || []).map(id => Number(id));
              setScheduledCells(new Set(normalizedIds));
            } else {
              // Check if still valid
              const now = Date.now();
              const elapsed = (now - data.timestamp) / (1000 * 60 * 60); // hours
              if (elapsed < newDuration) {
                const normalizedIds = (data.cellIds || []).map(id => Number(id));
                setScheduledCells(new Set(normalizedIds));
              } else {
                // Expired - clear
                setScheduledCells(new Set());
                localStorage.removeItem('scheduledCells');
              }
            }
          }
        } catch (error) {
          logger.error('Error validating scheduled cells:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Check for changes periodically (for same-tab updates)
    const interval = setInterval(() => {
      // Check QR upload setting
      const savedQr = localStorage.getItem('qrUploadEnabled');
      const currentQrValue = savedQr !== null ? savedQr === 'true' : true;
      if (currentQrValue !== qrUploadEnabled) {
        setQrUploadEnabled(currentQrValue);
      }
      
      // Check schedule duration
      const savedDuration = localStorage.getItem('scheduleDuration');
      const currentDuration = savedDuration !== null ? parseInt(savedDuration, 10) : 12;
      if (currentDuration !== scheduleDuration) {
        setScheduleDuration(currentDuration);
        
        // Validate current scheduled cells
        try {
          const saved = localStorage.getItem('scheduledCells');
          if (saved) {
            const data = JSON.parse(saved);
            if (currentDuration === -1) {
              // Indefinitely - keep all (normalize IDs to numbers)
              const normalizedIds = (data.cellIds || []).map(id => Number(id));
              setScheduledCells(new Set(normalizedIds));
            } else {
              // Check if still valid
              const now = Date.now();
              const elapsed = (now - data.timestamp) / (1000 * 60 * 60); // hours
              if (elapsed >= currentDuration) {
                // Expired - clear
                setScheduledCells(new Set());
                localStorage.removeItem('scheduledCells');
              } else {
                // Still valid - normalize IDs
                const normalizedIds = (data.cellIds || []).map(id => Number(id));
                setScheduledCells(new Set(normalizedIds));
              }
            }
          }
        } catch (error) {
          logger.error('Error validating scheduled cells:', error);
        }
      }
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [qrUploadEnabled, scheduleDuration]);

  const fetchAvailableCells = async () => {
    try {
      logger.debug('Fetching available cells...');
      const response = await api.get('/api/cells/active');
      logger.debug('Fetched available cells:', response.data);
      setAvailableCells(response.data);
      setCellsLoaded(true);
      logger.debug('Cells loaded and ready for scanning');
      
      // Validate scheduledCells against newly loaded cells
      // Remove any scheduled cell IDs that don't exist in availableCells
      setScheduledCells(prev => {
        const availableCellIds = new Set(response.data.map(c => Number(c.id)));
        const validScheduledIds = Array.from(prev).filter(id => availableCellIds.has(Number(id)));
        
        if (validScheduledIds.length !== prev.size) {
          logger.warn(`Removed ${prev.size - validScheduledIds.length} invalid scheduled cell IDs`);
          const newSet = new Set(validScheduledIds.map(id => Number(id)));
          
          // Update localStorage
          try {
            localStorage.setItem('scheduledCells', JSON.stringify({
              cellIds: Array.from(newSet).map(id => Number(id)),
              timestamp: Date.now()
            }));
          } catch (error) {
            logger.error('Error updating scheduled cells:', error);
          }
          
          return newSet;
        }
        
        return prev;
      });
    } catch (error) {
      logger.error('Failed to fetch cells:', error);
      setCellsLoaded(false); // Mark as not loaded on error
    }
  };

  const handleCellScheduleToggle = (cellId) => {
    setScheduledCells(prev => {
      const newSet = new Set(prev);
      // Normalize cellId to number for consistent comparison
      const normalizedId = Number(cellId);
      
      if (newSet.has(normalizedId)) {
        newSet.delete(normalizedId);
      } else {
        newSet.add(normalizedId);
      }
      
      // Save to localStorage (normalize all IDs to numbers)
      try {
        localStorage.setItem('scheduledCells', JSON.stringify({
          cellIds: Array.from(newSet).map(id => Number(id)),
          timestamp: Date.now()
        }));
      } catch (error) {
        logger.error('Error saving scheduled cells:', error);
      }
      
      return newSet;
    });
  };

  const isCellScheduled = (cellId) => {
    // Normalize to number for consistent comparison
    const normalizedId = Number(cellId);
    return scheduledCells.has(normalizedId);
  };

  // Helper function to check if a cell number string matches any scheduled cell
  // This supports BOTH old format (just "1") and new format ("Cell - 1", "Quarantine - 1")
  // cellsToCheck: optional parameter to pass cells directly (for when state hasn't updated yet)
  const isCellNumberScheduled = (cellNumberString, cellsToCheck = null) => {
    // Use passed cells or fall back to state
    const cells = cellsToCheck || availableCells;
    
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.debug('CELL SCHEDULING CHECK');
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.debug('Input cell string:', cellNumberString);
    logger.debug('Available cells count:', cells.length);
    logger.debug('Using cells:', cells === cellsToCheck ? 'PASSED DIRECTLY' : 'FROM STATE');
    logger.debug('Available cells:', cells.map(c => ({
      id: c.id, 
      idType: typeof c.id,
      number: c.cell_number, 
      name: c.cell_name
    })));
    logger.debug('Scheduled cell IDs:', Array.from(scheduledCells));
    logger.debug('Scheduled cell ID types:', Array.from(scheduledCells).map(id => ({id, type: typeof id})));
    
    // Check if cells is empty
    if (!cells || cells.length === 0) {
      logger.error('ERROR: No available cells loaded! Cannot match cell.');
      return false;
    }
    
    // UNIVERSAL CELL NUMBER EXTRACTOR
    // Handles: "1", "Cell - 1", "Quarantine - 1", "Cell Name - 1", etc.
    const extractCellNumber = (str) => {
      if (!str) return '';
      const strTrimmed = str.trim();
      
      // If format contains " - ", extract the number after the last " - "
      // Examples: "Cell - 1" → "1", "Quarantine - 1" → "1", "Some Name - 5" → "5"
      if (strTrimmed.includes(' - ')) {
        const parts = strTrimmed.split(' - ');
        const lastPart = parts[parts.length - 1].trim();
        logger.debug(`Extracting from "${strTrimmed}" → "${lastPart}"`);
        return lastPart;
      }
      
      // Otherwise, it's just the number (old format)
      logger.debug(`Using as-is: "${strTrimmed}"`);
      return strTrimmed;
    };
    
    const extractedCellNumber = extractCellNumber(cellNumberString);
    logger.debug('Extracted cell number:', `"${extractedCellNumber}"`);
    
    // Find ALL cells that match the cell number (there might be multiple with same number but different names)
    // Examples: "Cell - 1" and "Quarantine - 1" both have cell_number = "1"
    const matchingCells = cells.filter(c => {
      const cellNum = String(c.cell_number).trim();
      
      // Match if the extracted number equals the cell number in database
      // Case-insensitive and type-flexible (handles "1" === 1, "1" === "1", etc.)
      const matches = 
        cellNum === extractedCellNumber ||
        cellNum.toLowerCase() === extractedCellNumber.toLowerCase() ||
        parseInt(cellNum, 10) === parseInt(extractedCellNumber, 10);
      
      logger.debug(`Cell ${c.id} (${c.cell_name || 'no name'} - ${cellNum}) vs QR:"${extractedCellNumber}" → ${matches ? 'MATCH' : 'NO MATCH'}`);
      
      return matches;
    });
    
    logger.debug(`Found ${matchingCells.length} cell(s) with number "${extractedCellNumber}"`);
    
    // Check if ANY of the matching cells are scheduled
    // Normalize cell.id to number for consistent comparison (Set uses strict equality)
    const scheduledMatchingCells = matchingCells.filter(c => {
      const normalizedId = Number(c.id);
      const isScheduled = scheduledCells.has(normalizedId);
      logger.debug(`Checking if cell ${c.id} (normalized: ${normalizedId}) is scheduled: ${isScheduled}`);
      return isScheduled;
    });
    const isScheduled = scheduledMatchingCells.length > 0;
    
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (matchingCells.length === 0) {
      logger.error(`NO CELL MATCHED!`);
      logger.error(`QR had: "${cellNumberString}"`);
      logger.error(`Extracted: "${extractedCellNumber}"`);
      logger.error(`Available cell numbers in DB: ${cells.map(c => c.cell_number).join(', ')}`);
    } else if (!isScheduled) {
      logger.warn(`Found ${matchingCells.length} cell(s) but NONE are scheduled!`);
      logger.warn(`Matching cells: ${matchingCells.map(c => `ID ${c.id} (${c.cell_name || 'no name'} - ${c.cell_number})`).join(', ')}`);
      logger.warn(`Scheduled cell IDs: ${Array.from(scheduledCells).join(', ')}`);
    } else {
      logger.debug(`SUCCESS! Found ${scheduledMatchingCells.length} scheduled cell(s):`);
      scheduledMatchingCells.forEach(c => {
        logger.debug(`Cell ID ${c.id} (${c.cell_name || 'no name'} - ${c.cell_number}) is scheduled`);
      });
    }
    
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return isScheduled;
  };

  // QR File Upload Handler
  const handleFileScan = async (file) => {
    if (!file) return;
    if (scanLocked || isScanningFile) return;

    setIsScanningFile(true);
    
    // Create a temporary element for Html5Qrcode instance
    const tempElementId = 'temp-qr-scanner-' + Date.now();
    const tempElement = document.createElement('div');
    tempElement.id = tempElementId;
    tempElement.style.display = 'none';
    document.body.appendChild(tempElement);
    
    let html5QrCode = null;
    
    try {
      html5QrCode = new Html5Qrcode(tempElementId);
      const decodedText = await html5QrCode.scanFile(file, true);
      
      if (decodedText) {
        await handleScan(decodedText);
      } else {
        showToast('No QR code found in the image', 'error');
      }
    } catch (error) {
      logger.error('Error scanning file:', error);
      if (error.message && (error.message.includes('No QR code found') || error.message.includes('QR code parse error'))) {
        showToast('No QR code found in the image. Please try another image.', 'error');
      } else {
        showToast('Error scanning QR code from image', 'error');
      }
    } finally {
      // Clean up: remove temp element
      // Note: scanFile doesn't start the camera, so we don't need to stop anything
      try {
        if (tempElement && tempElement.parentNode) {
          tempElement.parentNode.removeChild(tempElement);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
        logger.debug('Cleanup error (ignored):', cleanupError);
      }
      
      setIsScanningFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
      }
      handleFileScan(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please drop an image file', 'error');
        return;
      }
      handleFileScan(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Update localStorage when setting changes
  useEffect(() => {
    localStorage.setItem('qrUploadEnabled', qrUploadEnabled.toString());
  }, [qrUploadEnabled]);

  const handleScan = async (data) => {
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.debug('QR SCAN PROCESS STARTED');
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.debug('Raw QR data:', data);
    
    if (!data) {
      logger.warn('No data provided to handleScan');
      return;
    }
    
    // Check if scanner is in lockout period (5 seconds after time-out)
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setLockoutMessage(`Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before scanning again.`);
      showToast(`Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before scanning again.`, 'error');
      logger.debug(`Scanner in lockout period. Remaining: ${remainingSeconds} seconds`);
      return;
    }
    
    // Clear lockout message if lockout period has expired
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      setLockoutMessage('');
    }
    
    if (scanLocked) {
      logger.debug('Scan locked, ignoring scan. Current scanLocked state:', scanLocked);
      return;
    }
    
    // CRITICAL: Check if we're already processing a scan (synchronous ref check)
    if (isProcessingScanRef.current) {
      logger.debug('Scan already being processed, ignoring duplicate scan');
      return;
    }

    // CRITICAL: Ensure cells are loaded before processing scan
    // This is why file upload works (cells are loaded by then) but camera scan might fail
    let cellsToUse = availableCells;
    if (!cellsLoaded || !availableCells || availableCells.length === 0) {
      logger.warn('Cells not loaded yet, fetching now...');
      logger.warn('This is why camera scan might fail - cells need to be loaded first!');
      
      // Fetch cells directly and use the response
      try {
        const response = await api.get('/api/cells/active');
        cellsToUse = response.data;
        logger.debug('Fetched cells directly:', cellsToUse.length, 'cells');
        
        // Update state for future scans
        setAvailableCells(cellsToUse);
        setCellsLoaded(true);
      } catch (error) {
        logger.error('Failed to fetch cells:', error);
        showToast('System not ready. Please try again in a moment.', 'error');
        return;
      }
    }

    // STEP 1: Extract visitor_id from QR code
    // Supports both old format: [visitor_id:19][Visitor: ...] and new format: visitor_id:VIS-1001
    let visitorId = null;
    
    // Try to extract from bracket format first (old format): [visitor_id:19][Visitor: ...]
    const bracketRegex = /\[(.*?)\]/g;
    const bracketMatches = [...data.matchAll(bracketRegex)].map(match => match[1]);
    const visitorIdBracketMatch = bracketMatches.find(part => part.startsWith('visitor_id:'));
    if (visitorIdBracketMatch) {
      visitorId = visitorIdBracketMatch.replace('visitor_id:', '').trim();
      logger.debug('Extracted visitor_id from bracket format:', visitorId);
    } else if (data.includes('visitor_id:')) {
      // Try new format: "visitor_id:VIS-1001" or "visitor_id:19" (supports both string and numeric)
      const match = data.match(/visitor_id:([^\s\[\]]+)/i);
      if (match) {
        visitorId = match[1].trim();
        logger.debug('Extracted visitor_id from new format:', visitorId);
      }
    } else if (/^[\w-]+$/.test(data.trim())) {
      // QR code is just the visitor_id (string like "VIS-1001" or numeric like "19")
      visitorId = data.trim();
      logger.debug('Extracted visitor_id as plain value:', visitorId);
    }

    logger.debug('Extracted visitor_id from QR code:', visitorId);

    if (!visitorId) {
      logger.error('Invalid QR format - visitor_id not found');
      showToast('Invalid QR code format. Please use a valid visitor QR code.', 'error');
      return;
    }

    // Debounce same visitor_id for a short window
    const sig = `visitor_id:${visitorId}`;
    const nowMs = Date.now();
    
    // Check if we just timed out this visitor recently (within 5 seconds)
    // This prevents the modal from showing if user accidentally scans again right after time-out
    if (lastTimeOutAt && nowMs - lastTimeOutAt < 5000) {
      logger.debug('Recent time-out detected (within 5 seconds), ignoring scan to prevent duplicate modal');
      showToast('Please wait 5 seconds before scanning again after time-out.', 'error');
      return; // Ignore scan if we just timed out recently
    }
    
    // Extended debounce window: 1 second to prevent immediate re-scanning of SAME visitor
    // This allows scanning different visitors quickly, but prevents duplicate scans of same visitor
    if (lastScanSig === sig && nowMs - lastScanAt < 1000) {
      logger.debug('Duplicate scan of same visitor within 1 second, ignoring');
      return; // ignore duplicate immediately after previous scan of same visitor
    }
    
    // CRITICAL: Check if purpose modal is already open - prevent duplicate modals
    if (showPurposeModal) {
      logger.debug('Purpose modal already open, ignoring duplicate scan');
      return;
    }
    
    // CRITICAL: Check if success modal is already open - prevent duplicate modals
    if (showSuccessModal) {
      logger.debug('Success modal already open, ignoring duplicate scan');
      return;
    }
    
    // CRITICAL: Mark that we're processing this scan NOW (synchronous, prevents race conditions)
    isProcessingScanRef.current = true;
    setLastScanSig(sig);
    setLastScanAt(nowMs);
    setScanLocked(true);
    logger.debug('Scan locked and processing flag set to prevent duplicate processing');

    // STEP 2: Check if visitor has existing record in system (preflight check)
    // Backend will look up visitor details and check latest log
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.debug('STEP 2: Checking visitor status (backend-side validation)...');
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const preflight = await api.post('/api/scanned_visitors', {
        visitor_id: visitorId,
        only_check: true
      });

      const planned = preflight?.data?.action;
      const conjugalVerified = preflight?.data?.verified_conjugal === true;
      const visitorName = preflight?.data?.visitor_name;
      const pdlName = preflight?.data?.pdl_name;
      const cell = preflight?.data?.cell;
      
      logger.debug('Preflight response:', { 
        action: planned, 
        verified_conjugal: conjugalVerified,
        visitor_name: visitorName,
        pdl_name: pdlName,
        cell: cell
      });
      
      // Store verified_conjugal status and visitor details
      setVerifiedConjugal(conjugalVerified);
      
      if (planned === 'time_out') {
        // STEP 3: Time out - visitor already has time_in, directly execute time_out
        logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.debug('STEP 3: Executing TIME OUT (visitor already has time_in)');
        logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const timeOutResponse = await api.post('/api/scanned_visitors', {
          visitor_id: visitorId,
          device_time: new Date().toISOString()
        });
        
        logger.debug('Time out successful!');
        await fetchVisitors();
        
        // Track that we just timed out to prevent immediate re-scans
        const timeOutTimestamp = Date.now();
        setLastTimeOutAt(timeOutTimestamp);
        
        // Set lockout period immediately (5 seconds) - don't wait for OK button
        const lockoutDuration = 5000; // 5 seconds
        const lockoutExpiry = timeOutTimestamp + lockoutDuration;
        setLockoutUntil(lockoutExpiry);
        setLockoutMessage('Please wait 5 seconds before scanning again.');
        logger.debug('Lockout period set for 5 seconds after time-out');
        
        // Get visitor details from response (or use from preflight)
        const finalVisitorName = timeOutResponse?.data?.visitor_name || visitorName;
        const finalPdlName = timeOutResponse?.data?.pdl_name || pdlName;
        const finalCell = timeOutResponse?.data?.cell || cell;
        
        // Show success modal with exact message
        setSuccessModalData({
          type: 'time_out',
          message: 'You have successfully timed out.',
          visitorData: {
            visitor_name: finalVisitorName,
            pdl_name: finalPdlName,
            cell: finalCell
          }
        });
        setShowSuccessModal(true);
        // Keep scanner locked until user clicks OK
        // Don't reset isProcessingScanRef here - let OK button handle it
        return;
      }

      // STEP 3: Time in - check if visitor is verified for conjugal visit
      // BUT: Don't show if we just timed out recently (within 5 seconds)
      // This prevents the modal from appearing immediately after time-out
      const checkTimeMs = Date.now();
      if (lastTimeOutAt && checkTimeMs - lastTimeOutAt < 5000) {
        logger.debug('Recent time-out detected (within 5 seconds), preventing purpose modal from showing');
        showToast('Please wait 5 seconds before scanning again after time-out.', 'error');
        setTimeout(() => setScanLocked(false), 1000);
        return;
      }
      
      // If visitor is NOT verified for conjugal visit, proceed directly with "normal" purpose
      if (!conjugalVerified) {
        logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.debug('STEP 3: Visitor NOT verified for conjugal - proceeding directly with NORMAL visit');
        logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Automatically proceed with "normal" purpose without showing modal
        try {
          logger.debug('Sending time_in request to backend with "normal" purpose...');
          const response = await api.post('/api/scanned_visitors', {
            visitor_id: visitorId,
            device_time: new Date().toISOString(),
            purpose: 'normal'
          });

          const action = response?.data?.action;
          logger.debug('Backend response:', { action });
          
          if (action === 'time_in') {
            logger.debug('Time in successful!');
            await fetchVisitors();
            logger.debug('Visitor list refreshed');
            
            // Get visitor details from response
            const responseVisitorName = response?.data?.visitor_name || visitorName;
            const responsePdlName = response?.data?.pdl_name || pdlName;
            const responseCell = response?.data?.cell || cell;
            
            // Show success modal with exact message
            setSuccessModalData({
              type: 'time_in',
              message: 'You have successfully timed in.',
              visitorData: {
                visitor_name: responseVisitorName,
                pdl_name: responsePdlName,
                cell: responseCell,
                purpose: 'normal'
              }
            });
            setShowSuccessModal(true);
            // Keep scanner locked until user clicks OK
            // Don't reset isProcessingScanRef here - let OK button handle it
            return;
          } else {
            logger.warn('Unexpected action from backend:', action);
            showToast('Unexpected response from server', 'error');
            isProcessingScanRef.current = false; // Reset processing flag on error
            setTimeout(() => setScanLocked(false), 1000);
          }
        } catch (error) {
          logger.error('Error adding scanned visitor (auto normal):', error);
          showToast('Error adding scanned visitor', 'error');
          isProcessingScanRef.current = false; // Reset processing flag on error
          setTimeout(() => setScanLocked(false), 1000);
        }
        return; // Exit early - don't show purpose modal
      }
      
      // If visitor IS verified for conjugal visit, show purpose modal to let them choose
      // Double-check: Ensure purpose modal is not already open
      if (showPurposeModal) {
        logger.debug('Purpose modal already open, preventing duplicate');
        setTimeout(() => setScanLocked(false), 1000);
        return;
      }
      
      logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.debug('STEP 3: Showing purpose selection modal (TIME IN) - Visitor verified for conjugal');
      logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.debug('Visitor has no active session and is verified for conjugal - showing visit type selection');
      
      setPendingScanData({
        visitor_id: visitorId,
        visitor_name: visitorName,
        pdl_name: pdlName,
        cell: cell
      });
      setShowPurposeModal(true);
      logger.debug('Purpose modal opened (conjugal verified visitor)');
    } catch (e) {
      logger.error('Preflight scan error:', e);
      showToast('Scan preflight failed', 'error');
      isProcessingScanRef.current = false; // Reset processing flag on error
      setTimeout(() => setScanLocked(false), 800);
    }
  };

  const handlePurposeSelection = async (purpose) => {
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.debug('PURPOSE SELECTED:', purpose);
    logger.debug('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (!pendingScanData) {
      logger.error('No pending scan data!');
      return;
    }

    setShowPurposeModal(false);
    logger.debug('Purpose modal closed');

    try {
      logger.debug('Sending time_in request to backend...');
      const response = await api.post('/api/scanned_visitors', {
        visitor_id: pendingScanData?.visitor_id,
        device_time: new Date().toISOString(),
        purpose
      });

      const action = response?.data?.action;
      logger.debug('Backend response:', { action });
      
      if (action === 'time_out') {
        logger.debug('Time out successful!');
        await fetchVisitors();
        logger.debug('Visitor list refreshed');
        
        // Track that we just timed out to prevent immediate re-scans
        const timeOutTimestamp = Date.now();
        setLastTimeOutAt(timeOutTimestamp);
        
        // Set lockout period immediately (5 seconds) - don't wait for OK button
        const lockoutDuration = 5000; // 5 seconds
        const lockoutExpiry = timeOutTimestamp + lockoutDuration;
        setLockoutUntil(lockoutExpiry);
        setLockoutMessage('Please wait 5 seconds before scanning again.');
        logger.debug('Lockout period set for 5 seconds after time-out');
        
        // Get visitor details from response
        const responseVisitorName = response?.data?.visitor_name || pendingScanData?.visitor_name;
        const responsePdlName = response?.data?.pdl_name || pendingScanData?.pdl_name;
        const responseCell = response?.data?.cell || pendingScanData?.cell;
        
        setPendingScanData(null);
        setVerifiedConjugal(false);
        
        // Show success modal with exact message
        setSuccessModalData({
          type: 'time_out',
          message: 'You have successfully timed out.',
          visitorData: {
            visitor_name: responseVisitorName,
            pdl_name: responsePdlName,
            cell: responseCell
          }
        });
        setShowSuccessModal(true);
        // Keep scanner locked until user clicks OK
        // Don't reset isProcessingScanRef here - let OK button handle it
        return; // Return early to prevent unlocking immediately
      } else if (action === 'time_in') {
        logger.debug('Time in successful!');
        await fetchVisitors();
        logger.debug('Visitor list refreshed');
        
        // Get visitor details from response
        const responseVisitorName = response?.data?.visitor_name || pendingScanData?.visitor_name;
        const responsePdlName = response?.data?.pdl_name || pendingScanData?.pdl_name;
        const responseCell = response?.data?.cell || pendingScanData?.cell;
        
        setPendingScanData(null);
        setVerifiedConjugal(false);
        
        // Show success modal with exact message
        setSuccessModalData({
          type: 'time_in',
          message: 'You have successfully timed in.',
          visitorData: {
            visitor_name: responseVisitorName,
            pdl_name: responsePdlName,
            cell: responseCell,
            purpose: purpose
          }
        });
        setShowSuccessModal(true);
        // Keep scanner locked until user clicks OK
        // Don't reset isProcessingScanRef here - let OK button handle it
        return; // Return early to prevent unlocking immediately
      } else if (action === 'already_timed_out') {
        logger.warn('Visitor already timed out');
        showToast('This visitor has already timed out.', 'error');
        setPendingScanData(null);
        setVerifiedConjugal(false);
        isProcessingScanRef.current = false; // Reset processing flag on error
        // Unlock after error
        setTimeout(() => {
          setScanLocked(false);
          logger.debug('Scan unlocked after error');
        }, 1000);
      } else {
        logger.debug('Scan recorded!');
        showToast('Scan recorded!', 'success');
        await fetchVisitors();
        logger.debug('Visitor list refreshed');
        
        setPendingScanData(null);
        setVerifiedConjugal(false);
        isProcessingScanRef.current = false; // Reset processing flag
        // Unlock scanning after a short cooldown for other actions
        setTimeout(() => {
          setScanLocked(false);
          logger.debug('Scan unlocked after cooldown');
        }, 2000);
      }
    } catch (error) {
      logger.error('Error adding scanned visitor:', error);
      showToast('Error adding scanned visitor', 'error');
      setPendingScanData(null);
      setVerifiedConjugal(false);
      isProcessingScanRef.current = false; // Reset processing flag on error
      // Unlock after error
      setTimeout(() => {
        setScanLocked(false);
        logger.debug('Scan unlocked after error');
      }, 1000);
    }
  };

  const handleRowClick = (id) => {
    setSelectedVisitorId(id === selectedVisitorId ? null : id);
  };

  const openEditModalForRow = (visitor) => {
    if (!visitor) return;
    setSelectedVisitorId(visitor.id);
    setEditTimeIn(visitor.time_in ? toInputTimeHHMMSS(visitor.time_in) : '');
    setEditTimeOut(visitor.time_out ? toInputTimeHHMMSS(visitor.time_out) : '');
    setShowEditModal(true);
  };


  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisitorId) return;

    const dateStr = currentDateString;
    const timeInISO = new Date(`${dateStr}T${editTimeIn}`).toISOString();
    const timeOutISO = new Date(`${dateStr}T${editTimeOut}`).toISOString();

    try {
      await api.put(`/api/scanned_visitors/${selectedVisitorId}`, {
        time_in: timeInISO,
        time_out: timeOutISO
      });

      alert('Visitor times updated successfully.');
      setShowEditModal(false);
      fetchVisitors();
      window.dispatchEvent(new Event('visitorTimesUpdated'));
    } catch (error) {
      logger.error('Failed to update visitor times:', error);
      alert('Failed to update visitor times.');
    }
  };

  const filteredVisitors = visitors.filter(
    v => getDateString(v.time_in) === currentDateString
  );

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedDeleteIds([]);
      setSelectAll(false);
    } else {
      const allIds = filteredVisitors.map(v => v.id);
      setSelectedDeleteIds(allIds);
      setSelectAll(true);
    }
  };

  const handleToggleRowDelete = (id) => {
    setSelectedDeleteIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        if (selectAll && next.length !== filteredVisitors.length) setSelectAll(false);
        return next;
      } else {
        const next = [...prev, id];
        if (next.length === filteredVisitors.length) setSelectAll(true);
        return next;
      }
    });
  };

  const handleDelete = async () => {
    if (selectedDeleteIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedDeleteIds.length} record(s)?`)) return;
    try {
      await Promise.all(selectedDeleteIds.map(id => api.delete(`/api/scanned_visitors/${id}`)));
      setSelectedDeleteIds([]);
      setSelectAll(false);
      setSelectedVisitorId(null);
      await fetchVisitors();
    } catch (error) {
      logger.error('Failed to delete visitors:', error);
      alert('Failed to delete some visitors.');
    }
  };

  // Debug: Log toast state changes
  React.useEffect(() => {
    if (toast.show) {
      logger.debug('Toast is now visible:', toast);
    } else {
      logger.debug('Toast is now hidden');
    }
  }, [toast.show, toast.message, toast.type]);

  return (
    <div>
      {/* Toast Notification - Render via Portal to body */}
      {toast.show && ReactDOM.createPortal(
        <div 
          className={`dashboard-toast dashboard-toast-${toast.type}`}
          style={{
            position: 'fixed',
            top: isMobile ? (isSmallMobile ? '70px' : '90px') : '100px', // Mobile: 90px (or 70px for small), Desktop: 100px
            left: isMobile ? '10px' : '50%',
            right: isMobile ? '10px' : 'auto',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            zIndex: 999999,
            maxWidth: isMobile ? 'calc(100vw - 20px)' : '400px',
            minWidth: isMobile ? 'auto' : '300px',
            width: isMobile ? 'auto' : 'auto'
          }}
        >
          <div className="dashboard-toast-content">
            <div className="dashboard-toast-icon">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                {toast.type === 'success' ? (
                  <>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <path d="M22 4 12 14.01l-3-3"/>
                  </>
                ) : (
                  <>
                    <path d="M18 6 6 18"/>
                    <path d="M6 6l12 12"/>
                  </>
                )}
              </svg>
            </div>
            <span className="dashboard-toast-message">{toast.message}</span>
          </div>
        </div>,
        document.body
      )}
      
      <main className="dashboard-main">
        <section style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 16px 0' }}>QR Code Scanner</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <button 
              className="common-button" 
              onClick={() => setShowScheduleModal(true)}
              style={{
                background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Schedule
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '100%', padding: isMobile ? '0 10px' : '0' }}>
            {/* Lockout Message Display */}
            {lockoutUntil && Date.now() < lockoutUntil && (
              <div style={{
                width: '100%',
                maxWidth: '320px',
                padding: '12px 16px',
                background: '#fef3c7',
                border: '2px solid #fbbf24',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#92400e',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                {lockoutMessage || 'Please wait before scanning again.'}
              </div>
            )}
            <QRCodeScanner 
              onScan={handleScan} 
              onError={() => showToast('QR Scan error', 'error')} 
              resetTrigger={resetTrigger}
              scanLocked={scanLocked}
            />
            
            {qrUploadEnabled && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: isMobile ? '100%' : '320px',
                  maxWidth: '320px',
                  minHeight: '120px',
                  border: `2px dashed ${isDragging ? '#10b981' : '#d1d5db'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: isDragging ? '#f0fdf4' : '#f9fafb',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  textAlign: 'center'
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                  disabled={isScanningFile}
                />
                {isScanningFile ? (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', color: '#10b981' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Scanning QR code...</p>
                  </>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b7280' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <div>
                      <p style={{ margin: '0 0 4px 0', color: '#111827', fontSize: '14px', fontWeight: '600' }}>
                        Drop QR Code Image Here
                      </p>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>
                        or click to browse
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section>
          <div id="printable-dashboard" className="print-section">
            <div className="print-only" style={{ textAlign: 'center', marginBottom: '10px' }}>
              <img src="/logo1.png" alt="Logo 1" style={{ height: '60px', marginRight: '10px' }} />
              <img src="/logo2.png" alt="Logo 2" style={{ height: '60px', marginRight: '10px' }} />
              <img src="/logo3.png" alt="Logo 3" style={{ height: '60px' }} />
              <h1 style={{ marginTop: '10px' }}>SILANG MUNICIPAL JAIL VISITATION MANAGEMENT SYSTEM</h1>
            </div>

            <b style={{ display: 'block', textAlign: 'center', marginBottom: '10px' }}>
              {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </b>
            <h2 style={{ textAlign: 'center' }}>Allowed Visitors</h2>


            <table className="common-table">
              <thead>
                <tr>
                  <th className="no-print">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th>Visitor's Name</th>
                  <th>PDL's to be Visited</th>
                  <th>Cell</th>
                  <th>Purpose</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th className="no-print" style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.length === 0 ? (
                  <tr><td colSpan="7">No records</td></tr>
                ) : (
                  filteredVisitors.map(v => (
                    <tr
                      key={v.id}
                      onClick={() => handleRowClick(v.id)}
                      style={{
                        backgroundColor: v.id === selectedVisitorId ? '#d3d3d3' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td className="no-print">
                        <input
                          type="checkbox"
                          checked={selectedDeleteIds.includes(v.id)}
                          onChange={(e) => { e.stopPropagation(); handleToggleRowDelete(v.id); }}
                        />
                      </td>
                      <td>{capitalizeWords(v.visitor_name)}</td>
                      <td>{capitalizeWords(v.pdl_name)}</td>
                      <td>
                        {(() => {
                          const cell = availableCells.find(c => c.cell_number.toLowerCase() === v.cell.toLowerCase());
                          return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(v.cell)}` : capitalizeWords(v.cell);
                        })()}
                      </td>
                      <td>{v.purpose ? (v.purpose.charAt(0).toUpperCase() + v.purpose.slice(1)) : ''}</td>
                      <td>{formatTime(v.time_in)}</td>
                      <td>{v.time_out ? formatTime(v.time_out) : ''}</td>
                      <td className="no-print" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            className="common-button edit no-print"
                            onClick={(e) => { e.stopPropagation(); openEditModalForRow(v); }}
                          >
                            <svg className="button-icon" viewBox="0 0 24 24">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="common-button" onClick={() => window.print()}>
              <svg className="button-icon" viewBox="0 0 24 24">
                <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
              </svg>
              Print Table
            </button>
            {selectedDeleteIds.length > 0 && (
              <button className="common-button delete" onClick={handleDelete}>
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete Selected ({selectedDeleteIds.length})
              </button>
            )}
          </div>
        </section>

        {/* Purpose Selection Modal */}
        {showPurposeModal && (
          <Modal onClose={() => {
            setShowPurposeModal(false);
            setPendingScanData(null);
            setVerifiedConjugal(false);
            setScanLocked(false);
            logger.debug('Purpose modal closed, scan unlocked');
          }}>
            <div className="purpose-modal" style={{ 
              maxWidth: isMobile ? '95%' : '600px',
              width: '100%',
              padding: isMobile ? '16px' : '24px',
              maxHeight: isMobile ? '90vh' : 'auto',
              overflowY: isMobile ? 'auto' : 'visible'
            }}>
              {/* Header Section */}
              <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '32px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid #e2e8f0',
                  padding: isMobile ? '16px' : '24px',
                  borderRadius: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: isMobile ? '18px' : '22px', 
                    fontWeight: '700',
                    color: '#0f172a',
                    letterSpacing: '-0.5px'
                  }}>
                    Select Visit Type: Conjugal or Normal.
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: isMobile ? '12px' : '16px',
                    textAlign: 'left'
                  }}>
                    <div style={{
                      padding: isMobile ? '10px' : '12px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Visitor
                      </div>
                      <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#0f172a', fontWeight: '500', wordBreak: 'break-word' }}>
                        {capitalizeWords(pendingScanData?.visitor_name)}
                      </div>
                    </div>
                    <div style={{
                      padding: isMobile ? '10px' : '12px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        PDL
                      </div>
                      <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#0f172a', fontWeight: '500', wordBreak: 'break-word' }}>
                        {capitalizeWords(pendingScanData?.pdl_name)}
                      </div>
                    </div>
                    <div style={{
                      padding: isMobile ? '10px' : '12px',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        Cell
                      </div>
                      <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#0f172a', fontWeight: '500', wordBreak: 'break-word' }}>
                        {capitalizeWords(pendingScanData?.cell)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Purpose Buttons */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: isMobile ? '12px' : '16px',
                marginBottom: isMobile ? '20px' : '24px'
              }}>
                <button 
                  className="purpose-button conjugal" 
                  onClick={() => verifiedConjugal && handlePurposeSelection('conjugal')}
                  disabled={!verifiedConjugal}
                  style={{ 
                    background: verifiedConjugal 
                      ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                      : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    color: verifiedConjugal ? '#991b1b' : '#9ca3af',
                    padding: isMobile ? '20px 16px' : '24px 20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    cursor: verifiedConjugal ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    border: verifiedConjugal ? '2px solid #fecaca' : '2px solid #d1d5db',
                    boxShadow: verifiedConjugal ? '0 2px 8px rgba(220, 38, 38, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: isMobile ? '140px' : 'auto',
                    width: '100%',
                    opacity: verifiedConjugal ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile && verifiedConjugal) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(220, 38, 38, 0.15)';
                      e.currentTarget.style.borderColor = '#fca5a5';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = verifiedConjugal ? '0 2px 8px rgba(220, 38, 38, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = verifiedConjugal ? '#fecaca' : '#d1d5db';
                      e.currentTarget.style.background = verifiedConjugal 
                        ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isMobile && verifiedConjugal) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isMobile) {
                      setTimeout(() => {
                        e.currentTarget.style.background = verifiedConjugal 
                          ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
                          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                        e.currentTarget.style.borderColor = verifiedConjugal ? '#fecaca' : '#d1d5db';
                      }, 150);
                    }
                  }}
                >
                  <div style={{ 
                    background: verifiedConjugal 
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                      : 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                    borderRadius: '12px', 
                    width: isMobile ? '48px' : '56px', 
                    height: isMobile ? '48px' : '56px', 
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: verifiedConjugal ? '0 4px 8px rgba(220, 38, 38, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    <svg width={isMobile ? "24" : "28"} height={isMobile ? "24" : "28"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                      <path d="M12 14l3-3 3 3"/>
                    </svg>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '15px' : '16px', fontWeight: '600', color: verifiedConjugal ? '#991b1b' : '#9ca3af' }}>
                    Conjugal Visit
                    {!verifiedConjugal && (
                      <span style={{ display: 'block', fontSize: isMobile ? '10px' : '11px', fontWeight: '400', marginTop: '4px', color: '#ef4444' }}>
                        (Not verified)
                      </span>
                    )}
                  </h4>
                  <p style={{ margin: '0', fontSize: isMobile ? '12px' : '13px', color: verifiedConjugal ? '#7f1d1d' : '#6b7280', opacity: '0.8' }}>
                    {verifiedConjugal ? 'Private family visit' : 'Conjugal visit not verified'}
                  </p>
                </button>
                
                <button 
                  className="purpose-button normal" 
                  onClick={() => handlePurposeSelection('normal')}
                  style={{ 
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    color: '#166534',
                    padding: isMobile ? '20px 16px' : '24px 20px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid #bbf7d0',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: isMobile ? '140px' : 'auto',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(5, 150, 105, 0.15)';
                      e.currentTarget.style.borderColor = '#86efac';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(5, 150, 105, 0.08)';
                      e.currentTarget.style.borderColor = '#bbf7d0';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isMobile) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                      e.currentTarget.style.borderColor = '#86efac';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isMobile) {
                      setTimeout(() => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
                        e.currentTarget.style.borderColor = '#bbf7d0';
                      }, 150);
                    }
                  }}
                >
                  <div style={{ 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '12px', 
                    width: isMobile ? '48px' : '56px', 
                    height: isMobile ? '48px' : '56px', 
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 8px rgba(5, 150, 105, 0.2)'
                  }}>
                    <svg width={isMobile ? "24" : "28"} height={isMobile ? "24" : "28"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '15px' : '16px', fontWeight: '600', color: '#166534' }}>Normal Visit</h4>
                  <p style={{ margin: '0', fontSize: isMobile ? '12px' : '13px', color: '#15803d', opacity: '0.8' }}>Regular visitation</p>
                </button>
              </div>
              
              {/* Cancel Button */}
              <div style={{ textAlign: 'center', paddingTop: isMobile ? '12px' : '16px', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPurposeModal(false);
                    setPendingScanData(null);
                    setVerifiedConjugal(false);
                    setTimeout(() => setScanLocked(false), 500);
                  }}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    padding: isMobile ? '14px 24px' : '12px 32px',
                    borderRadius: '10px',
                    fontSize: isMobile ? '15px' : '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    width: isMobile ? '100%' : 'auto',
                    minHeight: isMobile ? '48px' : 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.target.style.background = '#f1f5f9';
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                  onTouchStart={(e) => {
                    if (isMobile) {
                      e.target.style.background = '#f1f5f9';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isMobile) {
                      setTimeout(() => {
                        e.target.style.background = '#f8fafc';
                        e.target.style.borderColor = '#e2e8f0';
                      }, 150);
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <Modal onClose={() => setShowEditModal(false)}>
            <div>
              <h3>Edit Visitor Times</h3>
              <form onSubmit={handleEditSubmit}>
                <label>
                  Time In (HH:MM:SS):
                  <input type="time" step="1" value={editTimeIn} onChange={(e) => setEditTimeIn(e.target.value)} required />
                </label>
                <br />
                <label>
                  Time Out (HH:MM:SS):
                  <input type="time" step="1" value={editTimeOut} onChange={(e) => setEditTimeOut(e.target.value)} required />
                </label>
                <br />
                <div className="common-modal-buttons">
                  <button type="submit" className="common-button save">
                    <svg className="button-icon" viewBox="0 0 24 24">
                      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                    </svg>
                    Save
                  </button>
                  <button type="button" className="common-button cancel" onClick={() => setShowEditModal(false)}>
                    <svg className="button-icon" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}

        {/* Success Confirmation Modal */}
        {showSuccessModal && ReactDOM.createPortal(
          <div className="common-modal" onClick={(e) => {
            // Don't allow closing by clicking outside - must click OK
            e.stopPropagation();
          }} style={{ zIndex: 10000 }}>
            <div className="common-modal-content" onClick={e => e.stopPropagation()} style={{
              maxWidth: isMobile ? '95%' : '500px',
              width: '100%',
              padding: isMobile ? '20px' : '32px',
              textAlign: 'center'
            }}>
              {/* Success Icon */}
              <div style={{
                width: isMobile ? '64px' : '80px',
                height: isMobile ? '64px' : '80px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: successModalData.type === 'time_out' 
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                <svg 
                  width={isMobile ? "32" : "40"} 
                  height={isMobile ? "32" : "40"} 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>

              {/* Success Message */}
              <h3 style={{ 
                margin: '0 0 20px 0', 
                fontSize: isMobile ? '20px' : '24px', 
                fontWeight: '700',
                color: '#111827'
              }}>
                {successModalData.message}
              </h3>

              {/* Visitor Details */}
              {successModalData.visitorData && (
                <div style={{
                  background: '#f8fafc',
                  padding: isMobile ? '16px' : '20px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '12px',
                    textAlign: 'left'
                  }}>
                    <div>
                      <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Visitor
                      </div>
                      <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#0f172a', fontWeight: '500' }}>
                        {capitalizeWords(successModalData.visitorData.visitor_name)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                        PDL
                      </div>
                      <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#0f172a', fontWeight: '500' }}>
                        {capitalizeWords(successModalData.visitorData.pdl_name)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Cell
                      </div>
                      <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#0f172a', fontWeight: '500' }}>
                        {capitalizeWords(successModalData.visitorData.cell)}
                      </div>
                    </div>
                    {successModalData.visitorData.purpose && (
                      <div>
                        <div style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                          Purpose
                        </div>
                        <div style={{ fontSize: isMobile ? '14px' : '15px', color: '#0f172a', fontWeight: '500' }}>
                          {capitalizeWords(successModalData.visitorData.purpose)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Type Badge */}
              <div style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: '600',
                marginBottom: '24px',
                background: successModalData.type === 'time_out' 
                  ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                  : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                color: successModalData.type === 'time_out' ? '#92400e' : '#065f46',
                border: successModalData.type === 'time_out' 
                  ? '1px solid #fcd34d'
                  : '1px solid #6ee7b7'
              }}>
                {successModalData.type === 'time_out' ? '⏰ Time Out' : '✅ Time In'}
              </div>

              {/* OK Button */}
              <button 
                type="button" 
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessModalData({ type: '', message: '', visitorData: null });
                  
                  // CRITICAL: Reset processing flag immediately when modal closes
                  // This allows next scan to proceed even if lockout is still active
                  isProcessingScanRef.current = false;
                  
                  // If this was a time-out, the lockout was already set immediately after time-out
                  // Just respect the existing lockout and unlock scanner after it expires
                  if (successModalData.type === 'time_out') {
                    // Lockout was already set immediately after time-out (5 seconds)
                    // Just wait for it to expire, then unlock scanner
                    // Check if lockout is still active
                    if (lockoutUntil && Date.now() < lockoutUntil) {
                      const remainingMs = lockoutUntil - Date.now();
                      setTimeout(() => {
                        setScanLocked(false);
                        logger.debug('Scanner unlocked after lockout period expired');
                      }, remainingMs);
                    } else {
                      // Lockout already expired, unlock immediately
                      setScanLocked(false);
                      logger.debug('Scanner unlocked (lockout already expired)');
                    }
                  } else {
                    // For time-in, unlock immediately (debounce will handle duplicate prevention)
                    // Update the timestamp to allow scanning different visitors quickly
                    const nowMs = Date.now();
                    setLastScanAt(nowMs);
                    
                    // Unlock immediately - the 1-second debounce will prevent duplicate scans
                    setScanLocked(false);
                    logger.debug('Scan unlocked after user confirmed success');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                  color: 'white',
                  border: 'none',
                  padding: isMobile ? '14px 32px' : '12px 40px',
                  borderRadius: '10px',
                  fontSize: isMobile ? '15px' : '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  width: isMobile ? '100%' : 'auto',
                  minHeight: isMobile ? '48px' : 'auto'
                }}
                onMouseEnter={(e) => {
                  if (!isMobile) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isMobile) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onTouchStart={(e) => {
                  if (isMobile) {
                    e.target.style.transform = 'scale(0.98)';
                  }
                }}
                onTouchEnd={(e) => {
                  if (isMobile) {
                    setTimeout(() => {
                      e.target.style.transform = 'scale(1)';
                    }, 150);
                  }
                }}
              >
                OK
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Schedule Modal */}
        {showScheduleModal && (
          <Modal onClose={() => setShowScheduleModal(false)}>
            <div style={{ maxWidth: '500px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
                Schedule Cell Visits
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  Select which cells are available for visits today. Only visitors to scheduled cells will be allowed to scan in.
                </p>
                
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {availableCells.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                      No active cells found. Please add cells in Settings first.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {availableCells.map((cell) => (
                        <label 
                          key={cell.id}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            padding: '12px',
                            background: isCellScheduled(cell.id) ? '#ecfdf5' : '#fff',
                            border: isCellScheduled(cell.id) ? '2px solid #10b981' : '2px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isCellScheduled(cell.id)}
                            onChange={() => handleCellScheduleToggle(cell.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: '#111827' }}>
                              {cell.cell_name ? `${cell.cell_name} - ${cell.cell_number}` : cell.cell_number}
                            </div>
                            {cell.cell_name && (
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                Cell Number: {cell.cell_number}
                              </div>
                            )}
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Capacity: {cell.capacity} | Status: {cell.status}
                            </div>
                          </div>
                          {isCellScheduled(cell.id) && (
                            <div style={{ 
                              background: '#10b981', 
                              color: 'white', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              Scheduled
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px 0',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  {scheduledCells.size} of {availableCells.length} cells scheduled
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      const emptySet = new Set();
                      setScheduledCells(emptySet);
                      // Clear from localStorage
                      try {
                        localStorage.removeItem('scheduledCells');
                      } catch (error) {
                        logger.error('Error clearing scheduled cells:', error);
                      }
                    }}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Clear All
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      // Normalize all IDs to numbers for consistent comparison
                      const allCellIds = new Set(availableCells.map(cell => Number(cell.id)));
                      setScheduledCells(allCellIds);
                      // Save to localStorage (normalize to numbers)
                      try {
                        localStorage.setItem('scheduledCells', JSON.stringify({
                          cellIds: Array.from(allCellIds).map(id => Number(id)),
                          timestamp: Date.now()
                        }));
                      } catch (error) {
                        logger.error('Error saving scheduled cells:', error);
                      }
                    }}
                    style={{
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="common-modal-buttons" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '12px',
                marginTop: '20px'
              }}>
                <button 
                  type="button" 
                  onClick={() => setShowScheduleModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
