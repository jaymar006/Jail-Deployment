import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';
import * as XLSX from 'xlsx';
import SkeletonTable from '../components/SkeletonTable';
import Dropdown from '../components/Dropdown';
import useTableState from '../hooks/useTableState';
import TablePagination from '../components/TablePagination';
import FilterChips from '../components/FilterChips';
import SortIndicator from '../components/SortIndicator';
import BulkActionBar from '../components/BulkActionBar';
import EmptyState from '../components/EmptyState';
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
  const [sortOption, setSortOption] = useState('none');
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // Table state via shared hook (search, sort, pagination, selection, filter chips)
  const table = useTableState({
    data: pdls,
    searchFields: ['last_name', 'first_name', 'middle_name', 'criminal_case_no', 'offense_charge', 'court_branch', 'cell_number'],
    defaultPageSize: 20,
  });

  const toggleCollapse = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter states for Show Only functionality (date filter — custom to this page)
  const [filterType, setFilterType] = useState('all'); // 'all', 'year', 'month', 'day'
  const [filterValue, setFilterValue] = useState('');

  const fileInputRef = useRef(null);
  const fileInputVisitorsRef = useRef(null);
  const tableWrapperRef = useRef(null);

  const navigate = useNavigate();

  // Reset table scroll position when page changes
  useEffect(() => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTop = 0;
    }
  }, [table.currentPage]);

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
  const [dataToolsOpen, setDataToolsOpen] = useState(false);

  // Data Tools dropdown menu item styles
  const dataToolsItemStyle = {
    width: '100%',
    padding: '10px 16px',
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
  };
  const dataToolsSectionStyle = {
    padding: '8px 16px 4px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#9ca3af',
    background: '#f9fafb'
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        setDataToolsOpen(false);
      }
    };

    if (dataToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dataToolsOpen]);

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
            'Visitor ID': '',
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
              'Visitor ID': visitor.visitor_id || '',
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
        { wch: 18 }, // Visitor ID
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
    if (window.innerWidth <= 768) {
      toggleCollapse(pdl.id);
      return;
    }
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

  // Sorting now handled by useTableState hook's onSort method

  // Selection now handled by useTableState hook

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (table.selectedIds.length === 0) {
      alert('Please select at least one PDL to delete.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${table.selectedIds.length} PDL(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const deletePromises = table.selectedIds.map(id => axios.delete(`/pdls/${id}`));
      await Promise.all(deletePromises);
      
      alert(`${table.selectedIds.length} PDL(s) successfully deleted.`);
      table.clearSelection();
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
        
        // If visitor_id is provided, search globally for visitor with that ID first
        if (visitorData.visitor_id) {
          try {
            // Search globally for visitor by visitor_id
            const allVisitorsRes = await axios.get('/api/visitors');
            const allVisitors = allVisitorsRes.data || [];
            const existingVisitorGlobal = allVisitors.find(v => 
              v.visitor_id && v.visitor_id.toLowerCase() === visitorData.visitor_id.toLowerCase()
            );
            
            if (existingVisitorGlobal) {
              // Visitor found globally by visitor_id - update it
              console.log(`Found existing visitor globally by visitor_id (${visitorData.visitor_id}) for row ${rowIndex}, updating...`);
              try {
                await axios.put(`/api/visitors/${existingVisitorGlobal.id}`, visitorData);
                console.log(`Updated visitor by visitor_id: ${visitorData.name} (${visitorData.visitor_id})`);
                return { type: 'success', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, action: 'updated' };
              } catch (err) {
                console.error(`Failed to update visitor for row ${rowIndex}:`, err);
                return { type: 'error', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, error: err.message };
              }
            }
          } catch (err) {
            console.error(`Error searching for visitor by visitor_id:`, err);
            // Continue with normal flow if search fails
          }
        }
        
        // Check if visitor already exists in this PDL
        try {
          const existingVisitorsRes = await axios.get(`/api/pdls/${pdl.id}/visitors`);
          const existingVisitors = existingVisitorsRes.data || [];
          
          // If visitor_id is provided, try to match by visitor_id within this PDL
          let existingVisitor = null;
          if (visitorData.visitor_id) {
            existingVisitor = existingVisitors.find(v => 
              v.visitor_id && v.visitor_id.toLowerCase() === visitorData.visitor_id.toLowerCase()
            );
            
            if (existingVisitor) {
              // Visitor found by visitor_id - update it
              console.log(`Found existing visitor by visitor_id (${visitorData.visitor_id}) in PDL for row ${rowIndex}, updating...`);
              try {
                await axios.put(`/api/visitors/${existingVisitor.id}`, visitorData);
                console.log(`Updated visitor by visitor_id: ${visitorData.name} (${visitorData.visitor_id})`);
                return { type: 'success', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, action: 'updated' };
              } catch (err) {
                console.error(`Failed to update visitor for row ${rowIndex}:`, err);
                return { type: 'error', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, error: err.message };
              }
            }
          }
          
          // If no match by visitor_id, check by name
          existingVisitor = existingVisitors.find(existingVisitor => 
            existingVisitor.name.toLowerCase() === visitorData.name.toLowerCase()
          );
          
          if (existingVisitor) {
            // If visitor_id is provided but doesn't match, update the existing visitor
            if (visitorData.visitor_id) {
              console.log(`Found existing visitor by name, updating with visitor_id for row ${rowIndex}: ${visitorData.name}`);
              try {
                await axios.put(`/api/visitors/${existingVisitor.id}`, visitorData);
                console.log(`Updated visitor with visitor_id: ${visitorData.name} (${visitorData.visitor_id})`);
                return { type: 'success', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, action: 'updated' };
              } catch (err) {
                console.error(`Failed to update visitor for row ${rowIndex}:`, err);
                return { type: 'error', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, error: err.message };
              }
            } else {
              console.log(`Skipped duplicate visitor for row ${rowIndex}: ${visitorData.name}`);
              return { type: 'skipped', reason: 'already_exists', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}` };
            }
          }
          
          // Check if PDL has no visitors - automatically add without prompting
          if (existingVisitors.length === 0) {
            console.log(`Automatically adding visitor to empty PDL for row ${rowIndex}: ${visitorData.name} to ${pdlLast}, ${pdlFirst} ${pdlMiddle}`);
            // Continue with adding the visitor automatically
          }
          
          await axios.post(`/api/pdls/${pdl.id}/visitors`, visitorData);
          console.log(`Added visitor to exact match PDL: ${pdlLast}, ${pdlFirst} ${pdlMiddle}`);
          return { type: 'success', visitor: visitorData.name, pdl: `${pdlLast}, ${pdlFirst} ${pdlMiddle}`, action: 'created' };
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

        const visitorId = normalizeSpaces(row['Visitor ID'] || '');
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
        
        // Include visitor_id if present in the import file
        if (visitorId) {
          visitorData.visitor_id = visitorId;
        }

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

  // Date filter (custom to this page, applied on top of hook's search)
  const filteredByDatePdls = React.useMemo(() => {
    if (filterType === 'all' || !filterValue) return table.filteredData;
    return table.filteredData.filter(pdl => {
      const arrestDate = pdl.arrest_date ? new Date(pdl.arrest_date) : null;
      const commitmentDate = pdl.commitment_date ? new Date(pdl.commitment_date) : null;
      switch (filterType) {
        case 'year': {
          const year = parseInt(filterValue);
          return (arrestDate && arrestDate.getFullYear() === year) ||
                 (commitmentDate && commitmentDate.getFullYear() === year);
        }
        case 'month': {
          const [ym, m] = filterValue.split('-');
          const y = parseInt(ym), mo = parseInt(m);
          return (arrestDate && arrestDate.getFullYear() === y && (arrestDate.getMonth() + 1) === mo) ||
                 (commitmentDate && commitmentDate.getFullYear() === y && (commitmentDate.getMonth() + 1) === mo);
        }
        case 'day': {
          const [yd, md, d] = filterValue.split('-');
          const y2 = parseInt(yd), m2 = parseInt(md), d2 = parseInt(d);
          return (arrestDate && arrestDate.getFullYear() === y2 && (arrestDate.getMonth() + 1) === m2 && arrestDate.getDate() === d2) ||
                 (commitmentDate && commitmentDate.getFullYear() === y2 && (commitmentDate.getMonth() + 1) === m2 && commitmentDate.getDate() === d2);
        }
        default: return true;
      }
    });
  }, [table.filteredData, filterType, filterValue]);

  // Apply dropdown sort option on top of date-filtered data
  const filteredSortedPdls = React.useMemo(() => {
    const arr = [...filteredByDatePdls];
    if (sortOption === 'cell') {
      arr.sort((a, b) => (parseInt(a.cell_number, 10) || 0) - (parseInt(b.cell_number, 10) || 0));
    } else if (sortOption === 'alphabetical') {
      arr.sort((a, b) => {
        const cA = parseInt(a.cell_number, 10) || 0, cB = parseInt(b.cell_number, 10) || 0;
        if (cA !== cB) return cA - cB;
        return a.last_name.localeCompare(b.last_name);
      });
    } else if (sortOption === 'alphabeticalWithCell') {
      arr.sort((a, b) => {
        const cmp = a.last_name.localeCompare(b.last_name);
        if (cmp !== 0) return cmp;
        return (parseInt(a.cell_number, 10) || 0) - (parseInt(b.cell_number, 10) || 0);
      });
    }
    return arr;
  }, [filteredByDatePdls, sortOption]);

  // Paginated data from the fully filtered+sorted set
  const currentPdls = React.useMemo(() => {
    if (table.pageSize === 'all') return filteredSortedPdls;
    const start = (table.currentPage - 1) * table.pageSize;
    return filteredSortedPdls.slice(start, start + table.pageSize);
  }, [filteredSortedPdls, table.currentPage, table.pageSize]);

  const resolvedTotalPages = React.useMemo(() => {
    const ps = table.pageSize === 'all' ? filteredSortedPdls.length : table.pageSize;
    return Math.max(1, Math.ceil(filteredSortedPdls.length / (ps || 1)));
  }, [filteredSortedPdls.length, table.pageSize]);

  // CSV Export
  const exportToExcel = () => {
    const dataToExport = filteredSortedPdls.map(pdl => ({
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
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 },
      { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PDLs');
    XLSX.writeFile(workbook, `PDL_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Refresh data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await fetchPdls(); } finally { setIsRefreshing(false); }
  };

  // Build filter chips for display
  const filterChips = React.useMemo(() => {
    const chips = [];
    if (table.searchTerm) chips.push({ key: 'search', label: 'Search', value: table.searchTerm });
    if (filterType !== 'all' && filterValue) {
      const label = filterType === 'year' ? `Year: ${filterValue}` :
                    filterType === 'month' ? `Month: ${filterValue}` : `Day: ${filterValue}`;
      chips.push({ key: 'date', label: 'Date', value: label.replace(/^(Year|Month|Day): /, '') });
    }
    return chips;
  }, [table.searchTerm, filterType, filterValue]);

  const handleClearFilterChip = (key) => {
    if (key === 'search') table.setSearchTerm('');
    if (key === 'date') { setFilterType('all'); setFilterValue(''); }
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
        {/* Data Tools and Import progress */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {/* Import Progress */}
            {(isImportingPdls || isImporting) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '4px',
                  padding: '8px 14px'
                }}>
                  <svg className="button-icon" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite', transformOrigin: 'center', width: '16px', height: '16px' }}>
                    <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
                  </svg>
                  Importing... ({isImportingPdls ? pdlImportProgress.current : importProgress.current}/{isImportingPdls ? pdlImportProgress.total : importProgress.total})
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportFileChange} />
              <input ref={fileInputVisitorsRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportPdlsWithVisitorsFileChange} />
        </div>

        <FilterChips chips={filterChips} onClear={handleClearFilterChip} onClearAll={() => { table.clearAllFilters(); setFilterType('all'); setFilterValue(''); }} />

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <input
              type="text"
              className="table-search-input"
              placeholder="Search PDLs, names, cases..."
              value={table.searchTerm}
              onChange={(e) => table.setSearchTerm(e.target.value)}
              aria-label="Search PDLs"
            />
          </div>
          <div className="table-toolbar-right">
            <div className="table-toolbar-actions">
              <button className={`toolbar-icon-btn ${isRefreshing ? 'spinning' : ''}`} onClick={handleRefresh} disabled={isRefreshing} title="Refresh data">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              </button>
              <div
                className="data-tools-dropdown-wrap"
                data-dropdown
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={() => setDataToolsOpen(true)}
                onMouseLeave={() => setDataToolsOpen(false)}
              >
                <button className="toolbar-icon-btn" title="Data Tools">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </button>
                {dataToolsOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    minWidth: '260px',
                    overflow: 'hidden'
                  }}>
                    <div style={dataToolsSectionStyle}>Export</div>
                    <button
                      onClick={() => { exportToExcel(); setDataToolsOpen(false); }}
                      style={dataToolsItemStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                      Export PDL
                    </button>
                    <button
                      onClick={() => { exportVisitorsToExcelLinkHandler(); setDataToolsOpen(false); }}
                      style={{ ...dataToolsItemStyle, borderTop: '1px solid #f3f4f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                      Export PDL with Visitors
                    </button>
                    <div style={dataToolsSectionStyle}>Import</div>
                    <button
                      onClick={() => {
                        if (!isImportingPdls && !isImporting) {
                          fileInputRef.current && fileInputRef.current.click();
                          setDataToolsOpen(false);
                        }
                      }}
                      disabled={isImportingPdls || isImporting}
                      style={{
                        ...dataToolsItemStyle,
                        opacity: (isImportingPdls || isImporting) ? 0.5 : 1,
                        cursor: (isImportingPdls || isImporting) ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => { if (!isImportingPdls && !isImporting) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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
                        if (!isImportingPdls && !isImporting) {
                          fileInputVisitorsRef.current && fileInputVisitorsRef.current.click();
                          setDataToolsOpen(false);
                        }
                      }}
                      disabled={isImportingPdls || isImporting}
                      style={{
                        ...dataToolsItemStyle,
                        borderTop: '1px solid #f3f4f6',
                        opacity: (isImportingPdls || isImporting) ? 0.5 : 1,
                        cursor: (isImportingPdls || isImporting) ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => { if (!isImportingPdls && !isImporting) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      Import PDL with Visitors
                    </button>
                    <div style={dataToolsSectionStyle}>Download Template</div>
                    <button
                      onClick={() => { downloadPdlTemplateLinkHandler(); setDataToolsOpen(false); }}
                      style={dataToolsItemStyle}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fffbeb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      PDL Template
                    </button>
                    <button
                      onClick={() => { downloadPdlWithVisitorsTemplateLinkHandler(); setDataToolsOpen(false); }}
                      style={{ ...dataToolsItemStyle, borderTop: '1px solid #f3f4f6' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fffbeb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
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
            <Dropdown
              value={sortOption}
              onChange={(val) => setSortOption(val)}
              ariaLabel="Sort Options"
              minWidth={180}
              options={[
                { value: 'none', label: 'No Sort' },
                { value: 'cell', label: 'Sort by Cell' },
                { value: 'alphabetical', label: 'Alphabetical + Cell' },
                { value: 'alphabeticalWithCell', label: 'Alphabetical' },
              ]}
            />
            <Dropdown
              value={filterType}
              onChange={(val) => { setFilterType(val); setFilterValue(''); }}
              ariaLabel="Filter type"
              minWidth={140}
              options={[
                { value: 'all', label: 'All Dates' },
                { value: 'year', label: 'By Year' },
                { value: 'month', label: 'By Month' },
                { value: 'day', label: 'By Day' },
              ]}
            />
            {filterType !== 'all' && (
              <Dropdown
                value={filterValue}
                onChange={(val) => setFilterValue(val)}
                ariaLabel={`Select ${filterType}`}
                minWidth={200}
                options={[
                  { value: '', label: `Select ${filterType}...` },
                  ...(filterType === 'year'
                    ? getUniqueYears().map((year) => ({ value: year, label: String(year) }))
                    : filterType === 'month'
                    ? getUniqueYears().map((year) =>
                        getUniqueMonths(year).map((month) => ({
                          value: `${year}-${month}`,
                          label: new Date(year, month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
                        }))
                      ).flat()
                    : getUniqueYears().map((year) =>
                        getUniqueMonths(year).map((month) =>
                          getUniqueDays(year, month).map((day) => ({
                            value: `${year}-${month}-${day}`,
                            label: new Date(year, month - 1, day).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                          }))
                        ).flat()
                      ).flat()),
                ]}
              />
            )}
            <button className="common-button add" type="button" onClick={() => setShowAddModal(true)}>
              <svg className="button-icon" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
              Add PDL
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        <BulkActionBar
          count={table.selectedIds.length}
          onDelete={handleBulkDelete}
          onExport={exportToExcel}
          onClear={table.clearSelection}
        />
        
        <div className="table-wrapper" ref={tableWrapperRef}>
          {loadingPdls ? (
            <SkeletonTable columns={12} rows={7} minWidth={0} />
          ) : (
          <table className="common-table datas-table card-table">
            <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={table.selectAll}
                  onChange={table.toggleSelectAll}
                  style={{ marginRight: '8px' }}
                />
              </th>
              <th className="sortable-th" onClick={() => table.onSort('last_name')}>Last Name <SortIndicator column="last_name" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('first_name')}>First Name <SortIndicator column="first_name" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('middle_name')}>Middle Name <SortIndicator column="middle_name" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('cell_number')}>Cell Number <SortIndicator column="cell_number" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('criminal_case_no')}>Criminal Case No. <SortIndicator column="criminal_case_no" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('offense_charge')}>Offense Charge <SortIndicator column="offense_charge" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('court_branch')}>Court Branch <SortIndicator column="court_branch" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('arrest_date')}>Date of Arrest <SortIndicator column="arrest_date" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('commitment_date')}>Date of Commitment <SortIndicator column="commitment_date" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th className="sortable-th" onClick={() => table.onSort('first_time_offender')}>First Time Offender <SortIndicator column="first_time_offender" currentSort={table.sortColumn} direction={table.sortDirection} /></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPdls.map((pdl) => (
              <tr 
                key={pdl.id}
                onClick={() => handlePdlClick(pdl)}
                className={expandedIds.has(pdl.id) ? 'card-expanded' : 'card-collapsed'}
                style={{ cursor: 'pointer' }}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={table.selectedIds.includes(pdl.id)}
                    onChange={() => table.toggleSelect(pdl.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td data-label="Last Name">{pdl.last_name}</td>
                <td data-label="First Name">{pdl.first_name}</td>
                <td data-label="Middle Name">{pdl.middle_name}</td>
                <td data-label="Cell Number">
                  {(() => {
                    const cell = availableCells.find(c => c.cell_number === pdl.cell_number);
                    return cell && cell.cell_name ? `${cell.cell_name} - ${pdl.cell_number}` : pdl.cell_number;
                  })()}
                </td>
                <td data-label="Criminal Case No.">{pdl.criminal_case_no}</td>
                <td data-label="Offense Charge">{pdl.offense_charge}</td>
                <td data-label="Court Branch">{pdl.court_branch}</td>
                <td data-label="Date of Arrest">{formatDate(pdl.arrest_date)}</td>
                <td data-label="Date of Commitment">{formatDate(pdl.commitment_date)}</td>
                <td data-label="First Time Offender">{pdl.first_time_offender === 1 || pdl.first_time_offender === '1' ? 'Yes' : 'No'}</td>
                <td onClick={(e) => e.stopPropagation()} data-label="Actions">
                  <div className="action-buttons-row table-row-hover-actions">
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
                <td className="card-summary">{pdl.last_name}{pdl.first_name ? `, ${pdl.first_name}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
          )}
        </div>

        {/* Empty state */}
        {!loadingPdls && filteredSortedPdls.length === 0 && (
          <EmptyState
            title={pdls.length === 0 ? "No PDL records yet" : "No PDL records found"}
            description={pdls.length === 0 ? "Add your first PDL to get started." : "Try adjusting your search or filters."}
            actionLabel={pdls.length === 0 ? "Add a PDL" : "Clear filters"}
            onAction={pdls.length === 0 ? () => setShowAddModal(true) : () => { table.clearAllFilters(); setFilterType('all'); setFilterValue(''); }}
          />
        )}

        {/* Pagination */}
        {filteredSortedPdls.length > 0 && (
          <TablePagination
            currentPage={table.currentPage}
            totalPages={resolvedTotalPages}
            totalItems={pdls.length}
            filteredItems={filteredSortedPdls.length}
            pageSize={table.pageSize}
            onPageChange={table.setCurrentPage}
            onPageSizeChange={table.setPageSize}
          />
        )}
      </main>

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} wide={true}>
          <div className="add-pdl-modal" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="add-pdl-title">Add a PDL</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="add-pdl-sections">
                <div className="add-pdl-section">
                  <h4>Personal Information</h4>
                  <div className="add-pdl-fields">
                    <div className="add-pdl-field">
                      <label>Last Name *</label>
                      <input
                        type="text"
                        placeholder="Enter last name"
                        value={addForm.last_name}
                        onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                        onBlur={(e) => setAddForm({ ...addForm, last_name: capitalizeWords(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="add-pdl-field">
                      <label>First Name *</label>
                      <input
                        type="text"
                        placeholder="Enter first name"
                        value={addForm.first_name}
                        onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                        onBlur={(e) => setAddForm({ ...addForm, first_name: capitalizeWords(e.target.value) })}
                        required
                      />
                    </div>
                    <div className="add-pdl-field">
                      <label>Middle Name</label>
                      <input
                        type="text"
                        placeholder="Enter middle name"
                        value={addForm.middle_name}
                        onChange={(e) => setAddForm({ ...addForm, middle_name: e.target.value })}
                        onBlur={(e) => setAddForm({ ...addForm, middle_name: capitalizeWords(e.target.value) })}
                      />
                    </div>
                    <div className="add-pdl-field">
                      <label>Cell Number *</label>
                      <Dropdown
                        variant="form"
                        value={addForm.cell_number}
                        onChange={(val) => setAddForm({ ...addForm, cell_number: val })}
                        ariaLabel="Cell Number"
                        placeholder="Select a cell..."
                        name="add_cell_number"
                        required
                        options={availableCells.map((cell) => {
                          const cellDisplay = cell.cell_name ? `${cell.cell_name} - ${cell.cell_number}` : cell.cell_number;
                          return { value: cellDisplay, label: cellDisplay };
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="add-pdl-section">
                  <h4>Case Information</h4>
                  <div className="add-pdl-fields">
                    <div className="add-pdl-field">
                      <label>Criminal Case No.</label>
                      <input
                        type="text"
                        placeholder="Enter case number"
                        value={addForm.criminal_case_no}
                        onChange={(e) => setAddForm({ ...addForm, criminal_case_no: e.target.value })}
                      />
                    </div>
                    <div className="add-pdl-field">
                      <label>Offense Charge</label>
                      <input
                        type="text"
                        placeholder="Enter offense charge"
                        value={addForm.offense_charge}
                        onChange={(e) => setAddForm({ ...addForm, offense_charge: e.target.value })}
                      />
                    </div>
                    <div className="add-pdl-field">
                      <label>Court Branch</label>
                      <input
                        type="text"
                        placeholder="Enter court branch"
                        value={addForm.court_branch}
                        onChange={(e) => setAddForm({ ...addForm, court_branch: e.target.value })}
                      />
                    </div>
                    <div className="add-pdl-field">
                      <label>First Time Offender</label>
                      <Dropdown
                        variant="form"
                        value={addForm.first_time_offender}
                        onChange={(val) => setAddForm({ ...addForm, first_time_offender: val })}
                        ariaLabel="First Time Offender"
                        options={[
                          { value: 'No', label: 'No' },
                          { value: 'Yes', label: 'Yes' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="add-pdl-dates-section">
                <h4>Important Dates</h4>
                <div className="add-pdl-dates-grid">
                  <div className="add-pdl-field">
                    <label>Arrest Date</label>
                    <input
                      type="date"
                      value={addForm.arrest_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAddForm({ ...addForm, arrest_date: e.target.value })}
                    />
                  </div>
                  <div className="add-pdl-field">
                    <label>Commitment Date</label>
                    <input
                      type="date"
                      value={addForm.commitment_date}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setAddForm({ ...addForm, commitment_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="add-pdl-actions">
                <button type="submit" className="common-button">
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="common-button cancel"
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
                      <Dropdown
                        variant="form"
                        value={editForm.cell_number}
                        onChange={(val) => setEditForm({ ...editForm, cell_number: val })}
                        ariaLabel="Cell Number"
                        placeholder="Select a cell..."
                        name="edit_cell_number"
                        required
                        triggerStyle={{
                          width: '90%',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                        }}
                        options={availableCells.map((cell) => {
                          const cellDisplay = cell.cell_name ? `${cell.cell_name} - ${cell.cell_number}` : cell.cell_number;
                          return { value: cellDisplay, label: cellDisplay };
                        })}
                      />
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
                      <Dropdown
                        variant="form"
                        value={editForm.first_time_offender}
                        onChange={(val) => setEditForm({ ...editForm, first_time_offender: val })}
                        ariaLabel="First Time Offender"
                        triggerStyle={{
                          width: '90%',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                        }}
                        options={[
                          { value: 'No', label: 'No' },
                          { value: 'Yes', label: 'Yes' },
                        ]}
                      />
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
                  className="common-button"
                >
                  Submit
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="common-button cancel"
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
        </Modal>
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
                className="common-button cancel"
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
                className="common-button cancel"
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