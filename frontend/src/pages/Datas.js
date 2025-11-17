import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../services/api';
import * as XLSX from 'xlsx';
import './common.css';

const Modal = ({ children, onClose, wide = false }) => {
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
      <div className={`common-modal-content ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
};

// eslint-disable-next-line no-unused-vars
const formatDateOnly = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Normalize spaces: trim and collapse multiple spaces to single
const normalizeSpaces = (value) => String(value || '').replace(/\s+/g, ' ').trim();

// Capitalize the first letter of each word, lowercasing the rest
const capitalizeWords = (value) => {
  const normalized = normalizeSpaces(value);
  if (!normalized) return '';
  return normalized
    .split(' ')
    .map(word => word ? (word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) : '')
    .join(' ');
};

// Parse a date-like value from Excel to YYYY-MM-DD
const toYMD = (value) => {
  if (!value) return '';
  // If value is a Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = `${value.getMonth() + 1}`.padStart(2, '0');
    const d = `${value.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // If value is a number (Excel serial)
  if (typeof value === 'number') {
    const date = XLSX.SSF ? XLSX.SSF.parse_date_code(value) : null;
    if (date) {
      const y = date.y;
      const m = `${date.m}`.padStart(2, '0');
      const d = `${date.d}`.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  // If value is a string like MM/DD/YYYY or YYYY-MM-DD
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const mdY = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdY) {
    const m = mdY[1].padStart(2, '0');
    const d = mdY[2].padStart(2, '0');
    const y = mdY[3];
    return `${y}-${m}-${d}`;
  }
  // Fallback: try Date
  const d2 = new Date(str);
  if (!isNaN(d2.getTime())) {
    const y = d2.getFullYear();
    const m = `${d2.getMonth() + 1}`.padStart(2, '0');
    const d = `${d2.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
};



const Datas = () => {
  const [pdls, setPdls] = useState([]);
  const [loadingPdls, setLoadingPdls] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // New: track column and direction for header sorting
  const [sortColumn, setSortColumn] = useState(null); // e.g., 'last_name'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  
  // New state for checkbox selection
  const [selectedPdlIds, setSelectedPdlIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filter states for Show Only functionality
  const [filterType, setFilterType] = useState('all'); // 'all', 'year', 'month', 'day'
  const [filterValue, setFilterValue] = useState('');

  const fileInputRef = useRef(null);
  const fileInputVisitorsRef = useRef(null);
  const tableWrapperRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize sortOption from URL query param
  useEffect(() => {
    const sort = searchParams.get('sort');
    if (sort) {
      setSortOption(sort);
    }
  }, [searchParams]);

  // Update URL query param when sortOption changes
  useEffect(() => {
    if (sortOption && sortOption !== 'none') {
      setSearchParams({ sort: sortOption });
    } else {
      setSearchParams({});
    }
  }, [sortOption, setSearchParams]);

  // Reset current page to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset table scroll position when page changes
  useEffect(() => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [duplicatePdls, setDuplicatePdls] = useState([]);
  const [currentVisitorData, setCurrentVisitorData] = useState(null);
  const [pendingVisitorImports, setPendingVisitorImports] = useState([]);
  const [showImportSummaryModal, setShowImportSummaryModal] = useState(false);
  const [importSummary, setImportSummary] = useState({ success: [], skipped: [], errors: [] });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isImportingPdls, setIsImportingPdls] = useState(false);
  const [pdlImportProgress, setPdlImportProgress] = useState({ current: 0, total: 0 });
  const [showPdlImportSummaryModal, setShowPdlImportSummaryModal] = useState(false);
  const [pdlImportSummary, setPdlImportSummary] = useState({ success: [], skipped: [], errors: [] });
  const [addForm, setAddForm] = useState({
    last_name: '',
    first_name: '',
    middle_name: '',
    cell_number: '',
    criminal_case_no: '',
    offense_charge: '',
    court_branch: '',
    arrest_date: '',
    commitment_date: '',
    first_time_offender: 'No',
  });
  const [availableCells, setAvailableCells] = useState([]);
  
  // Dropdown states
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  const openEditModal = (pdl) => {
    const normalizedPdl = {
      ...pdl,
      first_time_offender: pdl.first_time_offender === 1 || pdl.first_time_offender === '1' ? 'Yes' : 'No',
      middle_name: pdl.middle_name || '',
    };
    setEditForm(normalizedPdl);
    setShowEditModal(true);
  };

  useEffect(() => {
    fetchPdls();
    fetchAvailableCells();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        setExportDropdownOpen(false);
        setImportDropdownOpen(false);
        setTemplateDropdownOpen(false);
      }
    };

    if (exportDropdownOpen || importDropdownOpen || templateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [exportDropdownOpen, importDropdownOpen, templateDropdownOpen]);

  const fetchAvailableCells = async () => {
    try {
      const response = await axios.get('/api/cells/active');
      setAvailableCells(response.data);
    } catch (error) {
      console.error('Failed to fetch cells:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const exportVisitorsToExcel = async (pdls) => {
    try {
      console.log('Exporting visitors for pdls in order:', pdls.map(p => p.id));
      const response = await axios.get('/api/visitors');
      const visitors = response.data;

      // Group visitors by pdl id
      const visitorsByPdl = visitors.reduce((acc, visitor) => {
        const pdlId = visitor.pdl_id;
        if (!acc[pdlId]) {
          acc[pdlId] = [];
        }
        acc[pdlId].push(visitor);
        return acc;
      }, {});

      // Prepare data for export with separate PDL columns, and include pdls with no visitors
      const dataToExport = [];

      pdls.forEach(pdl => {
        const pdlVisitors = visitorsByPdl[pdl.id] || [];
        const cellDisplay = formatCellNumber(pdl.cell_number);
        
        if (pdlVisitors.length === 0) {
          // Include pdl with no visitors
          dataToExport.push({
            'PDL Last Name': pdl.last_name || '',
            'PDL First Name': pdl.first_name || '',
            'PDL Middle Name': pdl.middle_name || '',
            'Cell Number': cellDisplay,
            'Visitor Name': '',
            'Relationship': '',
            'Age': '',
            'Address': '',
            'Valid ID': '',
            'Date of Application': '',
            'Contact Number': '',
          });
        } else {
          // Sort visitors by name alphabetically
          const sortedVisitors = pdlVisitors.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
          });
          sortedVisitors.forEach((visitor, index) => {
            dataToExport.push({
              'PDL Last Name': index === 0 ? (pdl.last_name || '') : '',
              'PDL First Name': index === 0 ? (pdl.first_name || '') : '',
              'PDL Middle Name': index === 0 ? (pdl.middle_name || '') : '',
              'Cell Number': index === 0 ? cellDisplay : '',
              'Visitor Name': visitor.name || '',
              'Relationship': visitor.relationship || '',
              'Age': visitor.age || '',
              'Address': visitor.address || '',
              'Valid ID': visitor.valid_id || '',
              'Date of Application': toYMD(visitor.date_of_application),
              'Contact Number': visitor.contact_number || '',
            });
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Set column widths to fit content approximately (no compression)
      worksheet['!cols'] = [
        { wch: 18 }, // PDL Last Name
        { wch: 18 }, // PDL First Name
        { wch: 18 }, // PDL Middle Name
        { wch: 20 }, // Cell Number
        { wch: 20 }, // Visitor Name
        { wch: 15 }, // Relationship
        { wch: 10 }, // Age
        { wch: 30 }, // Address
        { wch: 20 }, // Valid ID
        { wch: 20 }, // Date of Application
        { wch: 20 }, // Contact Number
      ];

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!worksheet[cellAddress]) continue;
        if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
        worksheet[cellAddress].s.font = { bold: true };
        worksheet[cellAddress].s.alignment = { horizontal: "left" };
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitors');
      XLSX.writeFile(workbook, 'Visitors_export.xlsx');
    } catch (error) {
      console.error('Failed to export visitors:', error);
      alert('Failed to export visitors');
    }
  };

  const fetchPdls = async () => {
    try {
      setLoadingPdls(true);
      const res = await axios.get('/pdls');
      const pdlsWithFormattedDates = res.data.map(pdl => {
        const formatLocalDate = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          // Get local date components
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        return {
          ...pdl,
          arrest_date: formatLocalDate(pdl.arrest_date),
          commitment_date: formatLocalDate(pdl.commitment_date),
        };
      });
      setPdls(pdlsWithFormattedDates);
    } catch (err) {
      console.error('Failed to fetch PDLs:', err);
    } finally {
      setLoadingPdls(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  // Helper function to format cell number consistently as "Name - Number"
  const formatCellNumber = (pdlCellNumber) => {
    if (!pdlCellNumber) return '';
    
    // If already in "Name - Number" format, return as is
    if (pdlCellNumber.includes(' - ')) {
      return pdlCellNumber;
    }
    
    // Try to find cell and format it
    const cell = availableCells.find(c => c.cell_number === pdlCellNumber);
    if (cell && cell.cell_name) {
      return `${cell.cell_name} - ${cell.cell_number}`;
    }
    
    // Fallback: return as is if no match found
    return pdlCellNumber;
  };

  const handlePdlClick = (pdl) => {
    navigate(`/visitors/${pdl.id}`, { state: { pdl } });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...addForm,
        first_time_offender: addForm.first_time_offender === 'Yes' ? 1 : 0,
      };
      await axios.post('/pdls', payload);
      fetchPdls();
      setShowAddModal(false);
      setAddForm({
        last_name: '',
        first_name: '',
        middle_name: '',
        cell_number: '',
        criminal_case_no: '',
        offense_charge: '',
        court_branch: '',
        arrest_date: '',
        commitment_date: '',
        first_time_offender: 'No',
      });
      alert('PDL Successfully Added ');
    } catch (err) {
      console.error('Failed to add PDL:', err.response?.data || err.message);
      alert('Failed to add PDL');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editForm,
        middle_name: editForm.middle_name || '',
        first_time_offender: editForm.first_time_offender === 'Yes' ? 1 : 0,
      };
      await axios.put(`/pdls/${editForm.id}`, payload);
      fetchPdls();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to update PDL:', err);
      alert(err.response?.data?.error || 'Failed to update PDL');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PDL?')) return;
    try {
      await axios.delete(`/pdls/${id}`);
      fetchPdls();
      alert('PDL successfully deleted.');
    } catch (err) {
      console.error('Failed to delete PDL:', err);
      alert(err.response?.data?.error || 'Failed to delete PDL.');
    }
  };

  // Handle click on header to set sortColumn and toggle direction
  const onHeaderClick = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle individual checkbox change
  const handlePdlCheckboxChange = (pdlId) => {
    setSelectedPdlIds((prevSelected) => {
      if (prevSelected.includes(pdlId)) {
        return prevSelected.filter(id => id !== pdlId);
      } else {
        return [...prevSelected, pdlId];
      }
    });
  };

  // Handle select all checkbox change
  const handleSelectAllChange = () => {
    if (selectAll) {
      setSelectedPdlIds([]);
      setSelectAll(false);
    } else {
      setSelectedPdlIds(currentPdls.map(pdl => pdl.id));
      setSelectAll(true);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedPdlIds.length === 0) {
      alert('Please select at least one PDL to delete.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedPdlIds.length} PDL(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      // Delete each selected PDL
      const deletePromises = selectedPdlIds.map(id => axios.delete(`/pdls/${id}`));
      await Promise.all(deletePromises);
      
      alert(`${selectedPdlIds.length} PDL(s) successfully deleted.`);
      setSelectedPdlIds([]);
      setSelectAll(false);
      await fetchPdls();
    } catch (err) {
      console.error('Failed to delete PDLs:', err);
      alert('Failed to delete some PDLs. Please try again.');
    }
  };

  // Helper functions for Show Only filter
  const getUniqueYears = () => {
    const years = new Set();
    pdls.forEach(pdl => {
      if (pdl.arrest_date) {
        const year = new Date(pdl.arrest_date).getFullYear();
        years.add(year);
      }
      if (pdl.commitment_date) {
        const year = new Date(pdl.commitment_date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  };

  const getUniqueMonths = (year) => {
    const months = new Set();
    pdls.forEach(pdl => {
      if (pdl.arrest_date) {
        const date = new Date(pdl.arrest_date);
        if (date.getFullYear() === year) {
          const month = date.getMonth() + 1; // getMonth() returns 0-11
          months.add(month);
        }
      }
      if (pdl.commitment_date) {
        const date = new Date(pdl.commitment_date);
        if (date.getFullYear() === year) {
          const month = date.getMonth() + 1; // getMonth() returns 0-11
          months.add(month);
        }
      }
    });
    return Array.from(months).sort((a, b) => b - a); // Sort descending (newest first)
  };

  const getUniqueDays = (year, month) => {
    const days = new Set();
    pdls.forEach(pdl => {
      if (pdl.arrest_date) {
        const date = new Date(pdl.arrest_date);
        if (date.getFullYear() === year && (date.getMonth() + 1) === month) {
          const day = date.getDate();
          days.add(day);
        }
      }
      if (pdl.commitment_date) {
        const date = new Date(pdl.commitment_date);
        if (date.getFullYear() === year && (date.getMonth() + 1) === month) {
          const day = date.getDate();
          days.add(day);
        }
      }
    });
    return Array.from(days).sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Download template for PDL-only import
  const downloadPdlImportTemplate = () => {
    const headers = [
      'Name', // Combined format: "Last Name, First Name Middle Name"
      'Last Name', // Separate format (optional if Name is used)
      'First Name', // Separate format (optional if Name is used)
      'Middle Name', // Separate format (optional if Name is used)
      'Cell Number', // Note: "Dorm Number" is also accepted
      'Criminal Case No.',
      'Offense Charge',
      'Court Branch',
      'Date of Arrest',
      'Date of Commitment',
      'First Time Offender',
    ];
    const sample = [
      ['Talisik, Angelo Freo', '', '', '', '6', 'CC-1234', 'Theft', 'Branch 5', '01/15/2024', '02/01/2024', 'No']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws['!cols'] = [
      { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDL Import Template');
    XLSX.writeFile(wb, 'PDL_Import_Template.xlsx');
  };

  // Download template for PDL with Visitors import (PDL fields + Visitor fields)
  const downloadPdlWithVisitorsTemplate = () => {
    const headers = ['PDL Name', 'PDL Last Name', 'PDL First Name', 'PDL Middle Name', 'Visitor Name', 'Relationship', 'Age', 'Address', 'Valid ID', 'Date of Application', 'Contact Number'];
    const sample = [
      ['Talisik, Angelo Freo', '', '', '', 'Alice Johnson', 'Mother', 48, '123 Main St, Sample City', 'ID-AJ-001', '01/10/2025', '555-1001'],
      ['', '', '', '', 'Bob Williams', 'Brother', 34, '45 Oak Ave, Sample City', 'ID-BW-002', '01/11/2025', '555-1002']
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    ws['!cols'] = [
      { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 16 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDL+Visitors Template');
    XLSX.writeFile(wb, 'PDL_with_Visitors_Template.xlsx');
  };

  // Import PDLs from uploaded Excel (PDL only)
  const handleImportFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsImportingPdls(true);
    setPdlImportProgress({ current: 0, total: 0 });

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) {
        alert('No rows found in the uploaded file.');
        setIsImportingPdls(false);
        return;
      }

      // Set total count for progress tracking
      setPdlImportProgress({ current: 0, total: rows.length });

      const errors = [];
      const importResults = { success: [], skipped: [], errors: [] };

      for (const [index, row] of rows.entries()) {
        // Update progress
        setPdlImportProgress({ current: index + 1, total: rows.length });
        
        // Map headers to fields - handle both "Cell Number" and "Dorm Number"
        const cellNumber = row['Cell Number'] || row['Dorm Number'] || '';
        
        // Handle combined name format: "Last Name, First Name Middle Name"
        let lastName = '';
        let firstName = '';
        let middleName = '';
        
        const combinedName = String(row['Name'] || '').trim();
        const separateLastName = String(row['Last Name'] || '').trim();
        const separateFirstName = String(row['First Name'] || '').trim();
        const separateMiddleName = String(row['Middle Name'] || '').trim();
        
        if (combinedName) {
          // Parse combined format: "Talisik, Angelo Freo"
          const parts = combinedName.split(',');
          if (parts.length === 2) {
            lastName = capitalizeWords(parts[0].trim());
            const nameParts = parts[1].trim().split(' ');
            if (nameParts.length >= 1) {
              firstName = capitalizeWords(nameParts[0]);
              if (nameParts.length > 1) {
                middleName = capitalizeWords(nameParts.slice(1).join(' '));
              }
            }
          }
        }
        
        // If combined name parsing failed or no combined name, use separate fields
        if (!lastName || !firstName) {
          lastName = capitalizeWords(separateLastName);
          firstName = capitalizeWords(separateFirstName);
          middleName = capitalizeWords(separateMiddleName);
        }
        
        const payload = {
          last_name: lastName,
          first_name: firstName,
          middle_name: middleName,
          cell_number: String(cellNumber).trim(),
          criminal_case_no: String(row['Criminal Case No.'] || '').trim(),
          offense_charge: String(row['Offense Charge'] || '').trim(),
          court_branch: String(row['Court Branch'] || '').trim(),
          arrest_date: toYMD(row['Date of Arrest']),
          commitment_date: toYMD(row['Date of Commitment']),
          first_time_offender: String(row['First Time Offender'] || 'No').toLowerCase().startsWith('y') ? 1 : 0,
        };

        // Debug logging
        console.log(`Row ${index + 2}:`, {
          originalRow: row,
          combinedName,
          separateLastName,
          separateFirstName,
          parsedPayload: payload
        });

        // Basic validation
        if (!payload.last_name || !payload.first_name || !payload.cell_number) {
          errors.push(`Row ${index + 2}: Missing required fields (Name or Last Name/First Name, Cell Number/Dorm Number)`);
          continue;
        }

        // Check if PDL already exists
        const existingPdl = pdls.find(pdl => 
          pdl.last_name.toLowerCase() === payload.last_name.toLowerCase() &&
          pdl.first_name.toLowerCase() === payload.first_name.toLowerCase() &&
          (pdl.middle_name || '').toLowerCase() === (payload.middle_name || '').toLowerCase()
        );

        if (existingPdl) {
          // PDL already exists, skip it
          importResults.skipped.push({
            pdl: `${payload.last_name}, ${payload.first_name} ${payload.middle_name}`,
            reason: 'already_exists'
          });
          console.log(`Skipped duplicate PDL for row ${index + 2}: ${payload.last_name}, ${payload.first_name} ${payload.middle_name}`);
        } else {
          try {
            await axios.post('/pdls', payload);
            importResults.success.push({
              pdl: `${payload.last_name}, ${payload.first_name} ${payload.middle_name}`
            });
          } catch (err) {
            const errorMessage = err.response?.data?.error || err.message;
            errors.push(`Row ${index + 2}: ${errorMessage}`);
            importResults.errors.push({
              pdl: `${payload.last_name}, ${payload.first_name} ${payload.middle_name}`,
              error: errorMessage
            });
          }
        }
      }

      await fetchPdls();

      // Set import summary and show modal
      setPdlImportSummary(importResults);
      setShowPdlImportSummaryModal(true);
    } catch (err) {
      console.error('Failed to import PDLs:', err);
      alert('Failed to import PDLs. Make sure the file follows the template.');
    } finally {
      setIsImportingPdls(false);
      setPdlImportProgress({ current: 0, total: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle duplicate PDL selection for visitor import
  const handleDuplicatePdlSelection = async (selectedPdlId) => {
    try {
      // Find the selected PDL to get its details
      const selectedPdl = duplicatePdls.find(pdl => pdl.id === selectedPdlId);
      
      // Check if visitor already exists in this PDL
      const existingVisitorsRes = await axios.get(`/api/pdls/${selectedPdlId}/visitors`);
      const existingVisitors = existingVisitorsRes.data || [];
      
      const visitorExists = existingVisitors.some(existingVisitor => 
        existingVisitor.name.toLowerCase() === currentVisitorData.name.toLowerCase()
      );
      
      if (visitorExists) {
        console.log(`Skipped duplicate visitor: ${currentVisitorData.name}`);
        const result = { type: 'skipped', reason: 'already_exists', visitor: currentVisitorData.name, pdl: `${selectedPdl.last_name}, ${selectedPdl.first_name} ${selectedPdl.middle_name}` };
        // Process next pending import if any
        if (pendingVisitorImports.length > 0) {
          const nextImport = pendingVisitorImports[0];
          setPendingVisitorImports(pendingVisitorImports.slice(1));
          await processVisitorImport(nextImport);
        } else {
          // All imports completed, refresh data
          await fetchPdls();
          setShowImportSummaryModal(true);
        }
        setShowDuplicateModal(false);
        setCurrentVisitorData(null);
        setDuplicatePdls([]);
        return result;
      }
      
      // Check if PDL has no visitors - automatically add without prompting
      if (existingVisitors.length === 0) {
        console.log(`Automatically adding visitor to empty PDL: ${currentVisitorData.name} to ${selectedPdl.last_name}, ${selectedPdl.first_name} ${selectedPdl.middle_name}`);
        // Continue with adding the visitor automatically
      }
      
      await axios.post(`/api/pdls/${selectedPdlId}/visitors`, currentVisitorData);
      const result = { type: 'success', visitor: currentVisitorData.name, pdl: `${selectedPdl.last_name}, ${selectedPdl.first_name} ${selectedPdl.middle_name}` };
      setShowDuplicateModal(false);
      setCurrentVisitorData(null);
      setDuplicatePdls([]);
      
      // Process next pending import if any
      if (pendingVisitorImports.length > 0) {
        const nextImport = pendingVisitorImports[0];
        setPendingVisitorImports(pendingVisitorImports.slice(1));
        await processVisitorImport(nextImport);
      } else {
        // All imports completed, refresh data
        await fetchPdls();
        setShowImportSummaryModal(true);
      }
      return result;
    } catch (err) {
      console.error('Failed to create visitor:', err);
      alert(`Failed to create visitor: ${err.response?.data?.error || err.message}`);
    }
  };

  // Process individual visitor import with smart matching
  const processVisitorImport = async (importData) => {
    const { pdlLast, pdlFirst, pdlMiddle, visitorData, rowIndex } = importData;
    
    // First, find PDLs by last name (case-insensitive)
    const lastNameMatches = pdls.filter(pdl => 
      pdl.last_name.toLowerCase() === pdlLast.toLowerCase()
    );

    if (lastNameMatches.length === 0) {
      // No PDL with this last name exists, prompt user
      const shouldCreate = window.confirm(
        `No PDL found with last name "${pdlLast}". Do you want to create a new PDL for this visitor?\n\n` +
        `Visitor: ${visitorData.name}\n` +
        `PDL: ${pdlLast}, ${pdlFirst} ${pdlMiddle}`
      );
      
      if (shouldCreate) {
        try {
          const newPdlPayload = {
            last_name: pdlLast,
            first_name: pdlFirst,
            middle_name: pdlMiddle,
            cell_number: 'TBD',
            criminal_case_no: '',
            offense_charge: '',
            court_branch: '',
            arrest_date: '',
            commitment_date: '',
            first_time_offender: 0
          };
          
          const response = await axios.post('/pdls', newPdlPayload);
          const newPdl = { id: response.data.id, ...newPdlPayload };
          
          // Add visitor to new PDL
          await axios.post(`/api/pdls/${newPdl.id}/visitors`, visitorData);
          console.log(`Created new PDL and visitor: ${pdlLast}, ${pdlFirst} ${pdlMiddle}`);
        } catch (err) {
          console.error(`Failed to create PDL and visitor for row ${rowIndex}:`, err);
        }
      } else {
        console.log(`Skipped creating PDL for row ${rowIndex}: ${pdlLast}, ${pdlFirst} ${pdlMiddle}`);
      }
    } else {
      // Found PDLs with matching last name, now check first names for verification
      const firstNameMatches = lastNameMatches.filter(pdl => 
        pdl.first_name.toLowerCase() === pdlFirst.toLowerCase()
      );
      
      if (firstNameMatches.length === 1) {
        // Perfect match: both last name and first name match exactly
        const pdl = firstNameMatches[0];
        
        // Check if visitor already exists in this PDL
        try {
          const existingVisitorsRes = await axios.get(`/api/pdls/${pdl.id}/visitors`);
          const existingVisitors = existingVisitorsRes.data || [];
          
          const visitorExists = existingVisitors.some(existingVisitor => 
            existingVisitor.name.toLowerCase() === visitorData.name.toLowerCase()
          );
          
          if (visitorExists) {
            console.log(`Skipped duplicate visitor for row ${rowIndex}: ${visitorData.name}`);
            return { type: 'skipped', reason: 'already_exists', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}` };
          }
          
          // Check if PDL has no visitors - automatically add without prompting
          if (existingVisitors.length === 0) {
            console.log(`Automatically adding visitor to empty PDL for row ${rowIndex}: ${visitorData.name} to ${pdlLast}, ${pdlFirst} ${pdlMiddle}`);
            // Continue with adding the visitor automatically
          }
          
          await axios.post(`/api/pdls/${pdl.id}/visitors`, visitorData);
          console.log(`Added visitor to exact match PDL: ${pdlLast}, ${pdlFirst} ${pdlMiddle}`);
          return { type: 'success', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}` };
        } catch (err) {
          console.error(`Failed to add visitor to PDL for row ${rowIndex}:`, err);
          return { type: 'error', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, error: err.message };
        }
      } else if (firstNameMatches.length > 1) {
        // Multiple PDLs with same last name AND first name, show selection modal
        setDuplicatePdls(firstNameMatches);
        setCurrentVisitorData({ ...visitorData, pdlFirst, pdlLast });
        setShowDuplicateModal(true);
        return { type: 'pending', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}` };
      } else {
        // No first name matches found - PDL doesn't exist
        console.log(`PDL doesn't exist: Looking for "${pdlLast}, ${pdlFirst}" but no matching first name found`);
        return { type: 'skipped', reason: 'pdl_not_found', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}` };
      }
    }
  };

  // Import PDLs with Visitors from uploaded Excel (PDL must already exist, resolved by name)
  const handleImportPdlsWithVisitorsFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) {
        alert('No rows found in the uploaded file.');
        setIsImporting(false);
        return;
      }

      // Set total count for progress tracking
      setImportProgress({ current: 0, total: rows.length });

      // Always fetch latest PDLs to avoid stale cache while importing
      const freshPdlsRes = await axios.get('/pdls');
      const freshPdls = freshPdlsRes.data || [];
      // Build a map of existing PDLs by composite key of names (case-insensitive, normalized spaces)
      const nameKey = (ln, fn, mn) => normalizeSpaces(`${(ln || '')}|${(fn || '')}|${(mn || '')}`).toLowerCase();
      const existingByName = new Map();
      freshPdls.forEach(p => existingByName.set(nameKey(p.last_name, p.first_name, p.middle_name || ''), p));

      const errors = [];
      let lastPdlData = { last_name: '', first_name: '', middle_name: '' };
      const importQueue = [];
      const importResults = { success: [], skipped: [], errors: [] };

      for (const [index, row] of rows.entries()) {
        // Handle both combined and separate PDL name formats
        let pdlLast = '';
        let pdlFirst = '';
        let pdlMiddle = '';
        
        const combinedPdlName = String(row['PDL Name'] || '').trim();
        const separatePdlLastName = String(row['PDL Last Name'] || '').trim();
        const separatePdlFirstName = String(row['PDL First Name'] || '').trim();
        const separatePdlMiddleName = String(row['PDL Middle Name'] || '').trim();
        
        if (combinedPdlName) {
          // Parse combined format: "Talisik, Angelo Freo"
          const parts = combinedPdlName.split(',');
          if (parts.length === 2) {
            pdlLast = capitalizeWords(normalizeSpaces(parts[0].trim()));
            const nameParts = parts[1].trim().split(' ');
            if (nameParts.length >= 1) {
              pdlFirst = capitalizeWords(normalizeSpaces(nameParts[0]));
              if (nameParts.length > 1) {
                pdlMiddle = capitalizeWords(normalizeSpaces(nameParts.slice(1).join(' ')));
              }
            }
          }
        }
        
        // If combined name parsing failed or no combined name, use separate fields with forward-fill
        if (!pdlLast || !pdlFirst) {
          pdlLast = capitalizeWords(normalizeSpaces(separatePdlLastName) || lastPdlData.last_name);
          pdlFirst = capitalizeWords(normalizeSpaces(separatePdlFirstName) || lastPdlData.first_name);
          pdlMiddle = capitalizeWords(normalizeSpaces(separatePdlMiddleName) || lastPdlData.middle_name);
        }

        if (!pdlLast || !pdlFirst) {
          errors.push(`Row ${index + 2}: Missing PDL Last Name or First Name.`);
          continue;
        }

        // Update lastPdlData for forward-filling
        lastPdlData = { last_name: pdlLast, first_name: pdlFirst, middle_name: pdlMiddle };

        const visitorName = normalizeSpaces(row['Visitor Name']);
        const relationship = normalizeSpaces(row['Relationship']);
        const ageVal = row['Age'];
        const age = ageVal === '' || ageVal === null || ageVal === undefined ? '' : Number(ageVal);
        const address = normalizeSpaces(row['Address']);
        const valid_id = normalizeSpaces(row['Valid ID']);
        const date_of_application = toYMD(row['Date of Application']);
        const contact_number = normalizeSpaces(row['Contact Number']);

        // Skip rows that don't have visitor data (empty PDLs)
        if (!visitorName || !relationship || !address || !valid_id || !date_of_application || !contact_number) {
          console.log(`Skipping row ${index + 2}: No visitor data (empty PDL or incomplete visitor info)`);
          continue;
        }

        const visitorData = {
          name: visitorName,
          relationship,
          age,
          address,
          valid_id,
          date_of_application,
          contact_number,
          verified_conjugal: false
        };

        // Add to import queue for processing
        importQueue.push({
          pdlLast,
          pdlFirst,
          pdlMiddle,
          visitorData,
          rowIndex: index + 2
        });
      }

      // Process imports one by one to handle user prompts
      for (let i = 0; i < importQueue.length; i++) {
        const importData = importQueue[i];
        setImportProgress({ current: i + 1, total: importQueue.length });
        
        const result = await processVisitorImport(importData);
        if (result) {
          if (result.type === 'success') {
            importResults.success.push(result);
          } else if (result.type === 'skipped') {
            importResults.skipped.push(result);
          } else if (result.type === 'error') {
            importResults.errors.push(result);
          }
        }
      }

      // Refresh PDLs after import
      await fetchPdls();

      // Set import summary and show modal
      setImportSummary(importResults);
      setShowImportSummaryModal(true);
    } catch (err) {
      console.error('Failed to import PDLs with visitors:', err);
      alert('Failed to import PDLs with visitors. Make sure the file follows the template.');
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
      if (fileInputVisitorsRef.current) {
        fileInputVisitorsRef.current.value = '';
      }
    }
  };

  // Filter PDLs based on search term and date filters
  const filterPdls = (pdls) => {
    let filtered = pdls;

    // Apply date filter
    if (filterType !== 'all' && filterValue) {
      filtered = filtered.filter(pdl => {
        const arrestDate = pdl.arrest_date ? new Date(pdl.arrest_date) : null;
        const commitmentDate = pdl.commitment_date ? new Date(pdl.commitment_date) : null;
        
        switch (filterType) {
          case 'year':
            const year = parseInt(filterValue);
            return (arrestDate && arrestDate.getFullYear() === year) || 
                   (commitmentDate && commitmentDate.getFullYear() === year);
          case 'month':
            const [yearMonth, month] = filterValue.split('-');
            const yearNum = parseInt(yearMonth);
            const monthNum = parseInt(month);
            return (arrestDate && arrestDate.getFullYear() === yearNum && (arrestDate.getMonth() + 1) === monthNum) ||
                   (commitmentDate && commitmentDate.getFullYear() === yearNum && (commitmentDate.getMonth() + 1) === monthNum);
          case 'day':
            const [yearDay, monthDay, day] = filterValue.split('-');
            const yearDayNum = parseInt(yearDay);
            const monthDayNum = parseInt(monthDay);
            const dayNum = parseInt(day);
            return (arrestDate && arrestDate.getFullYear() === yearDayNum && 
                   (arrestDate.getMonth() + 1) === monthDayNum && arrestDate.getDate() === dayNum) ||
                   (commitmentDate && commitmentDate.getFullYear() === yearDayNum && 
                   (commitmentDate.getMonth() + 1) === monthDayNum && commitmentDate.getDate() === dayNum);
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(pdl => {
        // Search in cell number - check both full format and extract parts
        let cellMatches = false;
        if (pdl.cell_number) {
          const cellLower = pdl.cell_number.toLowerCase();
          // Check if search matches the full cell number string
          if (cellLower.includes(searchLower)) {
            cellMatches = true;
          } else {
            // Extract cell name and number parts for separate matching
            // Format is "Name - Number" or just "Number"
            if (cellLower.includes(' - ')) {
              const [cellName, cellNumber] = cellLower.split(' - ');
              if (cellName.includes(searchLower) || cellNumber.includes(searchLower)) {
                cellMatches = true;
              }
            } else {
              // If no " - " separator, treat entire value as number
              if (cellLower.includes(searchLower)) {
                cellMatches = true;
              }
            }
          }
        }
        
        return (
          (pdl.last_name && pdl.last_name.toLowerCase().includes(searchLower)) ||
          (pdl.first_name && pdl.first_name.toLowerCase().includes(searchLower)) ||
          (pdl.middle_name && pdl.middle_name.toLowerCase().includes(searchLower)) ||
          (pdl.criminal_case_no && pdl.criminal_case_no.toLowerCase().includes(searchLower)) ||
          (pdl.offense_charge && pdl.offense_charge.toLowerCase().includes(searchLower)) ||
          (pdl.court_branch && pdl.court_branch.toLowerCase().includes(searchLower)) ||
          cellMatches
        );
      });
    }

    return filtered;
  };

  const filteredSortedPdls = filterPdls(pdls)
    .sort((a, b) => {
      // Preserve existing explicit sort options if set
      const cellA = parseInt(a.cell_number, 10) || 0;
      const cellB = parseInt(b.cell_number, 10) || 0;
      if (sortOption === 'cell') {
        return cellA - cellB;
      } else if (sortOption === 'alphabetical') {
        if (cellA !== cellB) return cellA - cellB;
        return a.last_name.localeCompare(b.last_name);
      } else if (sortOption === 'alphabeticalWithCell') {
        const lastNameCompare = a.last_name.localeCompare(b.last_name);
        if (lastNameCompare !== 0) return lastNameCompare;
        return cellA - cellB;
      }

      // New header sorting if sortColumn is set
      if (!sortColumn) return 0;
      const aVal = (a[sortColumn] ?? '').toString().toLowerCase();
      const bVal = (b[sortColumn] ?? '').toString().toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredSortedPdls.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPdls = filteredSortedPdls.slice(startIndex, startIndex + itemsPerPage);

  // Smart pagination: Generate page numbers with ellipsis
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7; // Maximum number of page buttons to show
    const sidePages = 2; // Number of pages to show on each side of current page

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    let startPage = Math.max(2, currentPage - sidePages);
    let endPage = Math.min(totalPages - 1, currentPage + sidePages);

    // Adjust if we're near the start
    if (currentPage <= sidePages + 2) {
      endPage = Math.min(maxVisible - 1, totalPages - 1);
    }

    // Adjust if we're near the end
    if (currentPage >= totalPages - sidePages - 1) {
      startPage = Math.max(2, totalPages - maxVisible + 2);
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push('ellipsis-start');
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push('ellipsis-end');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  // Update selectAll state when individual checkboxes change
  useEffect(() => {
    if (currentPdls.length === 0) {
      setSelectAll(false);
    } else {
      setSelectAll(selectedPdlIds.length === currentPdls.length);
    }
  }, [selectedPdlIds, currentPdls]);

  const exportToExcel = () => {
    const dataToExport = filteredSortedPdls.map(pdl => {
      return {
        'Last Name': pdl.last_name || '',
        'First Name': pdl.first_name || '',
        'Middle Name': pdl.middle_name || '',
        'Cell Number': formatCellNumber(pdl.cell_number),
        'Criminal Case No.': pdl.criminal_case_no || '',
        'Offense Charge': pdl.offense_charge || '',
        'Court Branch': pdl.court_branch || '',
        'Date of Arrest': pdl.arrest_date || '',
        'Date of Commitment': pdl.commitment_date || '',
        'First Time Offender': pdl.first_time_offender === 1 || pdl.first_time_offender === '1' ? 'Yes' : 'No',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths to fit content approximately
    worksheet['!cols'] = [
      { wch: 15 }, // Last Name
      { wch: 18 }, // First Name
      { wch: 15 }, // Middle Name
      { wch: 20 }, // Cell Number (wider to accommodate cell name)
      { wch: 20 }, // Criminal Case No.
      { wch: 30 }, // Offense Charge
      { wch: 20 }, // Court Branch
      { wch: 15 }, // Date of Arrest
      { wch: 15 }, // Date of Commitment
      { wch: 18 }, // First Time Offender
    ];

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!worksheet[cellAddress]) continue;
      if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
      worksheet[cellAddress].s.font = { bold: true };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PDLs');
    XLSX.writeFile(workbook, 'PDLs_export.xlsx');
  };

// Export PDL with Visitors
const exportPdlsWithVisitorsToExcel = async () => {
  try {
    const response = await axios.get('/api/visitors');
    const visitors = response.data;

    const visitorsByPdl = visitors.reduce((acc, visitor) => {
      const pdlId = visitor.pdl_id;
      if (!acc[pdlId]) acc[pdlId] = [];
      acc[pdlId].push(visitor);
      return acc;
    }, {});

    // Build rows: one row per visitor, include PDL fields once per block by leaving blanks for subsequent rows
    const rows = [];
    const sortedPdls = [...filteredSortedPdls];
    sortedPdls.forEach(pdl => {
      const pdlVisitors = (visitorsByPdl[pdl.id] || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      const cellDisplay = formatCellNumber(pdl.cell_number);
      
      if (pdlVisitors.length === 0) {
        // Create combined PDL name in format "Last Name, First Name Middle Name"
        const pdlName = `${pdl.last_name || ''}, ${pdl.first_name || ''} ${pdl.middle_name || ''}`.trim().replace(/,\s*$/, '');
        
        rows.push({
          'PDL Name': pdlName,
          'Cell Number': cellDisplay,
          'Visitor Name': '',
          'Relationship': '',
          'Age': '',
          'Address': '',
          'Valid ID': '',
          'Date of Application': '',
          'Contact Number': ''
        });
      } else {
        pdlVisitors.forEach((v, idx) => {
          // Create combined PDL name in format "Last Name, First Name Middle Name"
          const pdlName = `${pdl.last_name || ''}, ${pdl.first_name || ''} ${pdl.middle_name || ''}`.trim().replace(/,\s*$/, '');
          
          rows.push({
            'PDL Name': idx === 0 ? pdlName : '',
            'Cell Number': idx === 0 ? cellDisplay : '',
            'Visitor Name': v.name || '',
            'Relationship': v.relationship || '',
            'Age': v.age || '',
            'Address': v.address || '',
            'Valid ID': v.valid_id || '',
            'Date of Application': toYMD(v.date_of_application),
            'Contact Number': v.contact_number || ''
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }
    ];
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddress]) continue;
      if (!ws[cellAddress].s) ws[cellAddress].s = {};
      ws[cellAddress].s.font = { bold: true };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PDLs with Visitors');
    XLSX.writeFile(wb, 'PDLs_with_Visitors.xlsx');
  } catch (err) {
    console.error('Failed to export PDLs with visitors:', err);
    alert('Failed to export PDLs with visitors');
  }
};


  const exportVisitorsToExcelLinkHandler = () => {
    exportPdlsWithVisitorsToExcel();
  };

  const downloadPdlTemplateLinkHandler = () => downloadPdlImportTemplate();
  const downloadPdlWithVisitorsTemplateLinkHandler = () => downloadPdlWithVisitorsTemplate();


  return (
    <div className="common-container">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <main>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px',
            margin: '0 0 16px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="M12 11h4"/>
              <path d="M12 16h4"/>
              <path d="M8 11h.01"/>
              <path d="M8 16h.01"/>
            </svg>
            PDL Visitors Management
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {/* Add PDL Button */}
            <button className="common-button add" type="button" onClick={() => setShowAddModal(true)}>
              <svg className="button-icon" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Add a PDL
            </button>

            {/* Delete Selected Button (conditional) */}
            {selectedPdlIds.length > 0 && (
              <button className="common-button delete" type="button" onClick={handleBulkDelete}>
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                Delete Selected ({selectedPdlIds.length})
              </button>
            )}

            {/* Export Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }} data-dropdown>
              <button 
                className="common-button export" 
                type="button" 
                onClick={() => {
                  setExportDropdownOpen(!exportDropdownOpen);
                  setImportDropdownOpen(false);
                  setTemplateDropdownOpen(false);
                }}
                style={{ position: 'relative' }}
              >
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {exportDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '220px',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => {
                      exportToExcel();
                      setExportDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#374151',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Export PDL
                  </button>
                  <button
                    onClick={() => {
                      exportVisitorsToExcelLinkHandler();
                      setExportDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#374151',
                      borderTop: '1px solid #f3f4f6',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    Export PDL with Visitors
                  </button>
                </div>
              )}
            </div>

            {/* Import Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }} data-dropdown>
              <button 
                className="common-button export" 
                type="button" 
                onClick={() => {
                  if (!isImportingPdls && !isImporting) {
                    setImportDropdownOpen(!importDropdownOpen);
                    setExportDropdownOpen(false);
                    setTemplateDropdownOpen(false);
                  }
                }}
                disabled={isImportingPdls || isImporting}
                style={{ 
                  opacity: (isImportingPdls || isImporting) ? 0.6 : 1,
                  cursor: (isImportingPdls || isImporting) ? 'not-allowed' : 'pointer',
                  position: 'relative'
                }}
              >
                {(isImportingPdls || isImporting) ? (
                  <>
                    <svg className="button-icon" viewBox="0 0 24 24" style={{ 
                      animation: 'spin 1s linear infinite',
                      transformOrigin: 'center'
                    }}>
                      <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                    </svg>
                    Importing... ({isImportingPdls ? pdlImportProgress.current : importProgress.current}/{isImportingPdls ? pdlImportProgress.total : importProgress.total})
                  </>
                ) : (
                  <>
                    <svg className="button-icon" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </>
                )}
              </button>
              {importDropdownOpen && !isImportingPdls && !isImporting && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '220px',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => {
                      fileInputRef.current && fileInputRef.current.click();
                      setImportDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#374151',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import PDLs
                  </button>
                  <button
                    onClick={() => {
                      fileInputVisitorsRef.current && fileInputVisitorsRef.current.click();
                      setImportDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#374151',
                      borderTop: '1px solid #f3f4f6',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import PDL with Visitors
                  </button>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFileChange} />
            <input ref={fileInputVisitorsRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportPdlsWithVisitorsFileChange} />

            {/* Download Template Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }} data-dropdown>
              <button 
                className="common-button export"
                type="button" 
                onClick={() => {
                  setTemplateDropdownOpen(!templateDropdownOpen);
                  setExportDropdownOpen(false);
                  setImportDropdownOpen(false);
                }}
                style={{ position: 'relative' }}
              >
                <svg className="button-icon" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                Download Template
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {templateDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '240px',
                  overflow: 'hidden'
                }}>
                  <button
                    onClick={() => {
                      downloadPdlTemplateLinkHandler();
                      setTemplateDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#374151',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#fffbeb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    PDL Template
                  </button>
                  <button
                    onClick={() => {
                      downloadPdlWithVisitorsTemplateLinkHandler();
                      setTemplateDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      color: '#374151',
                      borderTop: '1px solid #f3f4f6',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#fffbeb'}
                    onMouseLeave={(e) => e.target.style.background = 'white'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    PDL with Visitors Template
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 style={{ textAlign: 'center', margin: '20px 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#111827' }}>PDL Lists</h3>
        
        <div className="search-filter-container">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: '20px',
            width: '100%'
          }}>
            {/* Search Section - Left Column */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'start' }}>
              <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Search:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Search PDLs, names, cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={(e) => {
                    e.target.style.outline = 'none';
                    e.target.style.borderColor = '#4b5563';
                    e.target.style.boxShadow = '0 0 0 3px rgba(75, 85, 99, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    transition: 'all 0.2s ease',
                    background: '#fff',
                    width: '250px'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      padding: '8px',
                      border: 'none',
                      background: '#ef4444',
                      color: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    title="Clear search"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Sort Section - Middle Column */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'center' }}>
              <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Sort:
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                aria-label="Sort Options"
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <option value="none">No Sort</option>
                <option value="cell">Sort by Cell</option>
                <option value="alphabetical">Sort Alphabetically with Cell</option>
                <option value="alphabeticalWithCell">Sort Alphabetically</option>
              </select>
            </div>
            
            {/* Show Only Section - Right Column */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifySelf: 'end' }}>
              <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Show Only:
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue('');
                }}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                  background: '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <option value="all">All Records</option>
                <option value="year">By Year</option>
                <option value="month">By Month</option>
                <option value="day">By Day</option>
              </select>
              
              {filterType !== 'all' && (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '120px'
                  }}
                >
                  <option value="">Select {filterType}...</option>
                  {filterType === 'year' && getUniqueYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                  {filterType === 'month' && getUniqueYears().map(year => 
                    getUniqueMonths(year).map(month => (
                      <option key={`${year}-${month}`} value={`${year}-${month}`}>
                        {new Date(year, month - 1).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </option>
                    ))
                  )}
                  {filterType === 'day' && getUniqueYears().map(year => 
                    getUniqueMonths(year).map(month => 
                      getUniqueDays(year, month).map(day => (
                        <option key={`${year}-${month}-${day}`} value={`${year}-${month}-${day}`}>
                          {new Date(year, month - 1, day).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </option>
                      ))
                    )
                  )}
                </select>
              )}
              
              <div style={{ 
                background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)', 
                color: 'white', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                fontWeight: '600',
                fontSize: '12px'
              }}>
                Showing: {filteredSortedPdls.length} of {pdls.length} records
              </div>
            </div>
          </div>
        </div>
        
        <div className="table-wrapper" ref={tableWrapperRef}>
          {loadingPdls ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '60px 20px',
              minHeight: '300px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #4b5563',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }}></div>
              <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading PDL data...</p>
            </div>
          ) : (
          <table className="common-table">
            <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAllChange}
                  style={{ marginRight: '8px' }}
                />
              </th>
              <th className="sortable-th" onClick={() => onHeaderClick('last_name')}>Last Name</th>
              <th className="sortable-th" onClick={() => onHeaderClick('first_name')}>First Name</th>
              <th className="sortable-th" onClick={() => onHeaderClick('middle_name')}>Middle Name</th>
              <th className="sortable-th" onClick={() => onHeaderClick('cell_number')}>Cell Number</th>
              <th className="sortable-th" onClick={() => onHeaderClick('criminal_case_no')}>Criminal Case No.</th>
              <th className="sortable-th" onClick={() => onHeaderClick('offense_charge')}>Offense Charge</th>
              <th className="sortable-th" onClick={() => onHeaderClick('court_branch')}>Court Branch</th>
              <th className="sortable-th" onClick={() => onHeaderClick('arrest_date')}>Date of Arrest</th>
              <th className="sortable-th" onClick={() => onHeaderClick('commitment_date')}>Date of Commitment</th>
              <th className="sortable-th" onClick={() => onHeaderClick('first_time_offender')}>First Time Offender</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPdls.map((pdl) => (
              <tr 
                key={pdl.id}
                onClick={() => handlePdlClick(pdl)}
                style={{ cursor: 'pointer' }}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedPdlIds.includes(pdl.id)}
                    onChange={() => handlePdlCheckboxChange(pdl.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td>{pdl.last_name}</td>
                <td>{pdl.first_name}</td>
                <td>{pdl.middle_name}</td>
                <td>
                  {(() => {
                    const cell = availableCells.find(c => c.cell_number === pdl.cell_number);
                    return cell && cell.cell_name ? `${cell.cell_name} - ${pdl.cell_number}` : pdl.cell_number;
                  })()}
                </td>
                <td>{pdl.criminal_case_no}</td>
                <td>{pdl.offense_charge}</td>
                <td>{pdl.court_branch}</td>
                <td>{formatDate(pdl.arrest_date)}</td>
                <td>{formatDate(pdl.commitment_date)}</td>
                <td>{pdl.first_time_offender === 1 || pdl.first_time_offender === '1' ? 'Yes' : 'No'}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="action-buttons-row">
                    <button 
                      className="common-button edit" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(pdl);
                      }} 
                      title="Edit PDL"
                    >
                      <svg className="button-icon" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button 
                      className="common-button delete" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pdl.id);
                      }} 
                      title="Delete PDL"
                    >
                      <svg className="button-icon" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination-container">
            <button
              className="pagination-button pagination-nav"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              aria-label="Go to first page"
              title="First page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="11 17 6 12 11 7"/>
                <polyline points="18 17 13 12 18 7"/>
              </svg>
            </button>
            <button
              className="pagination-button pagination-nav"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
              title="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            
            {getPaginationPages().map((pageNum, index) => {
              if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                return (
                  <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={pageNum}
                  className={`pagination-button ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={currentPage === pageNum ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              className="pagination-button pagination-nav"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
              title="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button
              className="pagination-button pagination-nav"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Go to last page"
              title="Last page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="13 17 18 12 13 7"/>
                <polyline points="6 17 11 12 6 7"/>
              </svg>
            </button>
            
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </main>

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} wide={true}>
          <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>Add a PDL</h3>
            <form onSubmit={handleAddSubmit}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Personal Information Section */}
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '2px solid #4b5563',
                    paddingBottom: '8px'
                  }}>
                    Personal Information
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Last Name *</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={addForm.last_name}
                        onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                        onBlur={(e) => setAddForm({ ...addForm, last_name: capitalizeWords(e.target.value) })}
                        required
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>First Name *</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={addForm.first_name}
                        onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                        onBlur={(e) => setAddForm({ ...addForm, first_name: capitalizeWords(e.target.value) })}
                        required
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Middle Name</label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={addForm.middle_name}
                        onChange={(e) => setAddForm({ ...addForm, middle_name: e.target.value })}
                        onBlur={(e) => setAddForm({ ...addForm, middle_name: capitalizeWords(e.target.value) })}
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Cell Number *</label>
                      <select 
                        value={addForm.cell_number} 
                        onChange={(e) => setAddForm({ ...addForm, cell_number: e.target.value })} 
                        required 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <option value="">Select a cell...</option>
                        {availableCells.map((cell) => {
                          const cellDisplay = cell.cell_name ? `${cell.cell_name} - ${cell.cell_number}` : cell.cell_number;
                          return (
                            <option key={cell.id} value={cellDisplay}>
                              {cellDisplay}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Case Information Section */}
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '2px solid #4b5563',
                    paddingBottom: '8px'
                  }}>
                    Case Information
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Criminal Case No.</label>
                      <input 
                        type="text" 
                        placeholder="Enter case number" 
                        value={addForm.criminal_case_no} 
                        onChange={(e) => setAddForm({ ...addForm, criminal_case_no: e.target.value })} 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Offense Charge</label>
                      <input 
                        type="text" 
                        placeholder="Enter offense charge" 
                        value={addForm.offense_charge} 
                        onChange={(e) => setAddForm({ ...addForm, offense_charge: e.target.value })} 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Court Branch</label>
                      <input 
                        type="text" 
                        placeholder="Enter court branch" 
                        value={addForm.court_branch} 
                        onChange={(e) => setAddForm({ ...addForm, court_branch: e.target.value })} 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>First Time Offender</label>
                      <select 
                        value={addForm.first_time_offender} 
                        onChange={(e) => setAddForm({ ...addForm, first_time_offender: e.target.value })}
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderBottom: '2px solid #4b5563',
                  paddingBottom: '8px'
                }}>
                  Important Dates
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '20px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Arrest Date</label>
                    <input
                      type="date"
                      value={addForm.arrest_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAddForm({ ...addForm, arrest_date: e.target.value })}
                      style={{
                        width: '90%',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fff',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Commitment Date</label>
                    <input
                      type="date"
                      value={addForm.commitment_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAddForm({ ...addForm, commitment_date: e.target.value })}
                      style={{
                        width: '90%',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fff',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="common-modal-buttons" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '12px',
                marginTop: '24px',
                paddingBottom: '20px'
              }}>
                <button 
                  type="submit"
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
                  Submit
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {showEditModal && (
        <Modal onClose={() => setShowEditModal(false)} wide={true}>
          <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>Edit PDL</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                marginBottom: '24px'
              }}>
                {/* Personal Information Section */}
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '2px solid #4b5563',
                    paddingBottom: '8px'
                  }}>
                    Personal Information
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Last Name *</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        onBlur={(e) => setEditForm({ ...editForm, last_name: capitalizeWords(e.target.value) })}
                        required
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>First Name *</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        onBlur={(e) => setEditForm({ ...editForm, first_name: capitalizeWords(e.target.value) })}
                        required
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Middle Name</label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={editForm.middle_name}
                        onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                        onBlur={(e) => setEditForm({ ...editForm, middle_name: capitalizeWords(e.target.value) })}
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Cell Number *</label>
                      <select 
                        value={editForm.cell_number} 
                        onChange={(e) => setEditForm({ ...editForm, cell_number: e.target.value })} 
                        required 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <option value="">Select a cell...</option>
                        {availableCells.map((cell) => {
                          const cellDisplay = cell.cell_name ? `${cell.cell_name} - ${cell.cell_number}` : cell.cell_number;
                          return (
                            <option key={cell.id} value={cellDisplay}>
                              {cellDisplay}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Case Information Section */}
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '20px', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '2px solid #4b5563',
                    paddingBottom: '8px'
                  }}>
                    Case Information
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Criminal Case No.</label>
                      <input 
                        type="text" 
                        placeholder="Enter case number" 
                        value={editForm.criminal_case_no} 
                        onChange={(e) => setEditForm({ ...editForm, criminal_case_no: e.target.value })} 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Offense Charge</label>
                      <input 
                        type="text" 
                        placeholder="Enter offense charge" 
                        value={editForm.offense_charge} 
                        onChange={(e) => setEditForm({ ...editForm, offense_charge: e.target.value })} 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Court Branch</label>
                      <input 
                        type="text" 
                        placeholder="Enter court branch" 
                        value={editForm.court_branch} 
                        onChange={(e) => setEditForm({ ...editForm, court_branch: e.target.value })} 
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          transition: 'border-color 0.2s ease'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>First Time Offender</label>
                      <select 
                        value={editForm.first_time_offender} 
                        onChange={(e) => setEditForm({ ...editForm, first_time_offender: e.target.value })}
                        style={{
                          width: '90%',
                          padding: '10px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '14px',
                          background: '#fff',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div style={{ 
                background: '#f8fafc', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginBottom: '24px'
              }}>
                <h4 style={{ 
                  margin: '0 0 20px 0', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#374151',
                  borderBottom: '2px solid #4b5563',
                  paddingBottom: '8px'
                }}>
                  Important Dates
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '20px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Arrest Date</label>
                    <input
                      type="date"
                      value={editForm.arrest_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditForm({ ...editForm, arrest_date: e.target.value })}
                      style={{
                        width: '90%',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fff',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>Commitment Date</label>
                    <input
                      type="date"
                      value={editForm.commitment_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditForm({ ...editForm, commitment_date: e.target.value })}
                      style={{
                        width: '90%',
                        padding: '10px 12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fff',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="common-modal-buttons" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '12px',
                marginTop: '24px',
                paddingBottom: '20px'
              }}>
                <button 
                  type="submit"
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
                  Submit
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Duplicate PDL Selection Modal */}
      {showDuplicateModal && (
        <Modal onClose={() => setShowDuplicateModal(false)}>
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#111827' }}>
              Select PDL for Visitor
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ marginBottom: '10px', fontWeight: '500', color: '#374151' }}>
                Multiple PDLs found with matching last name. Please select which PDL to add the visitor to:
              </p>
              <p style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                <strong>Visitor:</strong> {currentVisitorData?.name}
              </p>
              <p style={{ marginBottom: '15px', fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                Note: The system found PDLs with the same last name but different first names. Please verify the correct PDL.
              </p>
            </div>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              {duplicatePdls.map((pdl) => (
                <div
                  key={pdl.id}
                  onClick={() => handleDuplicatePdlSelection(pdl.id)}
                  style={{
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: '#fff'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#4b5563';
                    e.target.style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#fff';
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                    {pdl.last_name}, {pdl.first_name} {pdl.middle_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                    Cell: {pdl.cell_number} | Case: {pdl.criminal_case_no || 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Last Name: ✓ Match | First Name: {pdl.first_name.toLowerCase() === (currentVisitorData?.pdlFirst || '').toLowerCase() ? '✓ Match' : '✗ Different'}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowDuplicateModal(false);
                  setCurrentVisitorData(null);
                  setDuplicatePdls([]);
                }}
                style={{
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Modal */}
      {showImportSummaryModal && (
        <Modal onClose={() => setShowImportSummaryModal(false)}>
          <div style={{ maxWidth: '800px', maxHeight: '80vh' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#111827' }}>
              Import Summary
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                    {importSummary.success.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Successfully Added</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {importSummary.skipped.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Skipped</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                    {importSummary.errors.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Errors</div>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {/* Successfully Added */}
              {importSummary.success.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#10b981', marginBottom: '10px', fontSize: '16px', fontWeight: '600' }}>
                    ✅ Successfully Added ({importSummary.success.length})
                  </h4>
                  {importSummary.success.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      background: '#f0fdf4', 
                      border: '1px solid #bbf7d0', 
                      borderRadius: '6px', 
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{item.visitor}</strong> → {item.pdl}
                    </div>
                  ))}
                </div>
              )}

              {/* Skipped */}
              {importSummary.skipped.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: '10px', fontSize: '16px', fontWeight: '600' }}>
                    ⚠️ Skipped ({importSummary.skipped.length})
                  </h4>
                  {importSummary.skipped.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      background: '#fffbeb', 
                      border: '1px solid #fed7aa', 
                      borderRadius: '6px', 
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{item.visitor}</strong> → {item.pdl}
                      <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
                        {item.reason === 'already_exists' ? 'Already exists' : 
                         item.reason === 'empty_pdl_declined' ? 'Empty PDL declined' :
                         item.reason === 'pdl_not_found' ? 'PDL not found' : 'Unknown reason'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {importSummary.errors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#ef4444', marginBottom: '10px', fontSize: '16px', fontWeight: '600' }}>
                    ❌ Errors ({importSummary.errors.length})
                  </h4>
                  {importSummary.errors.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      background: '#fef2f2', 
                      border: '1px solid #fecaca', 
                      borderRadius: '6px', 
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{item.visitor}</strong> → {item.pdl}
                      <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                        {item.error}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setShowImportSummaryModal(false)}
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
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PDL Import Summary Modal */}
      {showPdlImportSummaryModal && (
        <Modal onClose={() => setShowPdlImportSummaryModal(false)}>
          <div style={{ maxWidth: '800px', maxHeight: '80vh' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '20px', fontWeight: '600', color: '#111827' }}>
              PDL Import Summary
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                    {pdlImportSummary.success.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Successfully Added</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                    {pdlImportSummary.skipped.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Skipped</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                    {pdlImportSummary.errors.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Errors</div>
                </div>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {/* Successfully Added */}
              {pdlImportSummary.success.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#10b981', marginBottom: '10px', fontSize: '16px', fontWeight: '600' }}>
                    ✅ Successfully Added ({pdlImportSummary.success.length})
                  </h4>
                  {pdlImportSummary.success.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      background: '#f0fdf4', 
                      border: '1px solid #bbf7d0', 
                      borderRadius: '6px', 
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{item.pdl}</strong>
                    </div>
                  ))}
                </div>
              )}

              {/* Skipped */}
              {pdlImportSummary.skipped.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#f59e0b', marginBottom: '10px', fontSize: '16px', fontWeight: '600' }}>
                    ⚠️ Skipped ({pdlImportSummary.skipped.length})
                  </h4>
                  {pdlImportSummary.skipped.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      background: '#fffbeb', 
                      border: '1px solid #fed7aa', 
                      borderRadius: '6px', 
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{item.pdl}</strong>
                      <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
                        Already exists
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {pdlImportSummary.errors.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ color: '#ef4444', marginBottom: '10px', fontSize: '16px', fontWeight: '600' }}>
                    ❌ Errors ({pdlImportSummary.errors.length})
                  </h4>
                  {pdlImportSummary.errors.map((item, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      background: '#fef2f2', 
                      border: '1px solid #fecaca', 
                      borderRadius: '6px', 
                      marginBottom: '4px',
                      fontSize: '13px'
                    }}>
                      <strong>{item.pdl}</strong>
                      <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                        {item.error}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => setShowPdlImportSummaryModal(false)}
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
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export { Datas };
export default Datas;