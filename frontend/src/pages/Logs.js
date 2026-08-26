import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SkeletonTable from '../components/SkeletonTable';
import Dropdown from '../components/Dropdown';
import './Dashboard.css';
import './common.css';
import * as XLSX from 'xlsx';

const Logs = () => {
  const [allowedVisitors, setAllowedVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterType, setFilterType] = useState('all'); // 'all', 'year', 'month', 'day'
  const [filterValue, setFilterValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  /** 'all' | 'normal' | 'conjugal' — matches scanned_visitors.purpose */
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [availableCells, setAvailableCells] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const tableWrapperRef = useRef(null);

  const toggleCollapse = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        console.log('Fetching visitors data in Logs.js');
        const allowedRes = await api.get('/api/scanned_visitors');
        setAllowedVisitors(allowedRes.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch visitors:', err);
        setError('Failed to fetch visitors data');
        setLoading(false);
      }
    };
    const fetchAvailableCells = async () => {
      try {
        const response = await api.get('/api/cells/active');
        setAvailableCells(response.data);
      } catch (error) {
        console.error('Failed to fetch cells:', error);
      }
    };

    fetchVisitors();
    fetchAvailableCells();

    // Listen for visitorTimesUpdated event to refresh logs
    const handleVisitorTimesUpdated = () => {
      console.log('visitorTimesUpdated event received in Logs.js');
      fetchVisitors();
    };
    window.addEventListener('visitorTimesUpdated', handleVisitorTimesUpdated);

    return () => {
      window.removeEventListener('visitorTimesUpdated', handleVisitorTimesUpdated);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterValue, purposeFilter]);

  useEffect(() => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatTimeOnly = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  };

  // Helper to capitalize the first letter of each word in a string
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get unique years from visitor data
  const getUniqueYears = () => {
    const years = new Set();
    allowedVisitors.forEach(visitor => {
      if (visitor.time_in) {
        const year = new Date(visitor.time_in).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Get unique months from visitor data for a specific year
  const getUniqueMonths = (year) => {
    const months = new Set();
    allowedVisitors.forEach(visitor => {
      if (visitor.time_in) {
        const date = new Date(visitor.time_in);
        if (date.getFullYear() === year) {
          const month = date.getMonth() + 1; // getMonth() returns 0-11
          months.add(month);
        }
      }
    });
    return Array.from(months).sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Get unique days from visitor data for a specific year and month
  const getUniqueDays = (year, month) => {
    const days = new Set();
    allowedVisitors.forEach(visitor => {
      if (visitor.time_in) {
        const date = new Date(visitor.time_in);
        if (date.getFullYear() === year && (date.getMonth() + 1) === month) {
          const day = date.getDate();
          days.add(day);
        }
      }
    });
    return Array.from(days).sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Filter visitors based on selected filter and search term
  const filterVisitors = (visitors) => {
    let filtered = visitors;

    // Apply date filter
    if (filterType !== 'all' && filterValue) {
      filtered = filtered.filter(visitor => {
        if (!visitor.time_in) return false;
        
        const date = new Date(visitor.time_in);
        
        switch (filterType) {
          case 'year':
            return date.getFullYear() === parseInt(filterValue);
          case 'month':
            const [year, month] = filterValue.split('-');
            return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
          case 'day':
            const [yearDay, monthDay, day] = filterValue.split('-');
            return date.getFullYear() === parseInt(yearDay) && 
                   (date.getMonth() + 1) === parseInt(monthDay) && 
                   date.getDate() === parseInt(day);
          default:
            return true;
        }
      });
    }

    // Visit type (purpose): normal vs conjugal
    if (purposeFilter !== 'all') {
      filtered = filtered.filter((visitor) => {
        const p = (visitor.purpose || '').toLowerCase().trim();
        if (purposeFilter === 'normal') {
          return p === 'normal' || p === '';
        }
        if (purposeFilter === 'conjugal') {
          return p === 'conjugal';
        }
        return true;
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(visitor => {
        return (
          (visitor.visitor_name && visitor.visitor_name.toLowerCase().includes(searchLower)) ||
          (visitor.pdl_name && visitor.pdl_name.toLowerCase().includes(searchLower)) ||
          (visitor.relationship && visitor.relationship.toLowerCase().includes(searchLower)) ||
          (visitor.cell && visitor.cell.toLowerCase().includes(searchLower)) ||
          (visitor.contact_number && visitor.contact_number.toLowerCase().includes(searchLower))
        );
      });
    }

    return filtered;
  };

  // Sorting handlers
  const onHeaderClick = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const filteredVisitors = filterVisitors(allowedVisitors);
  const sortedVisitors = [...filteredVisitors].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValRaw = a[sortColumn];
    const bValRaw = b[sortColumn];

    // For time fields, sort by date value
    if (['time_in', 'time_out', 'scan_date'].includes(sortColumn)) {
      const aTime = aValRaw ? new Date(aValRaw).getTime() : 0;
      const bTime = bValRaw ? new Date(bValRaw).getTime() : 0;
      if (aTime < bTime) return sortDirection === 'asc' ? -1 : 1;
      if (aTime > bTime) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }

    const aVal = (aValRaw ?? '').toString().toLowerCase();
    const bVal = (bValRaw ?? '').toString().toLowerCase();
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const resolvedPageSize = pageSize === 'all' ? sortedVisitors.length : pageSize;
  const totalPages = Math.max(1, Math.ceil(sortedVisitors.length / (resolvedPageSize || 1)));
  const startIndex = (currentPage - 1) * resolvedPageSize;
  const currentVisitors = sortedVisitors.slice(startIndex, startIndex + resolvedPageSize);

  const handlePageSizeChange = (e) => {
    const val = e.target.value;
    setPageSize(val === 'all' ? 'all' : Number(val));
    setCurrentPage(1);
  };

  // Smart pagination: Generate page numbers with ellipsis
  const getPaginationPages = () => {
    const pages = [];
    const maxVisible = 7;
    const sidePages = 2;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    let startPage = Math.max(2, currentPage - sidePages);
    let endPage = Math.min(totalPages - 1, currentPage + sidePages);

    if (currentPage <= sidePages + 2) {
      endPage = Math.min(maxVisible - 1, totalPages - 1);
    }

    if (currentPage >= totalPages - sidePages - 1) {
      startPage = Math.max(2, totalPages - maxVisible + 2);
    }

    if (startPage > 2) {
      pages.push('ellipsis-start');
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push('ellipsis-end');
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  // Function to handle extraction and download of grouped table data by date as formatted Excel file
  const handleExtractTable = () => {
    if (allowedVisitors.length === 0) {
      alert('No data to extract');
      return;
    }

    // Group visitors by date (date part of time_in)
    const groupedByDate = allowedVisitors.reduce((acc, visitor) => {
      const dateKey = visitor.time_in ? new Date(visitor.time_in).toLocaleDateString() : 'Unknown Date';
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(visitor);
      return acc;
    }, {});

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws_data = [];

    ws_data.push(["SILANG MUNICIPAL JAIL VISITATION MANAGEMENT SYSTEM"]);
    ws_data.push([]);

    // For each date group, add a date heading row and then the data rows
    Object.keys(groupedByDate).forEach((date) => {
      // Add date heading row (just date string, no "Date:" prefix)
      ws_data.push([date]);
      // Add header row with Contact Number after Visitor's Name and Relationship after PDL's to be Visit Name
      ws_data.push(["Visitor's Name", "Contact Number", "PDL Visited", "Relationship", "Cell", "Time In", "Time Out"]);

      // Add data rows
      groupedByDate[date].forEach((v) => {
        const timeIn = v.time_in ? new Date(v.time_in).toLocaleTimeString() : '';
        const timeOut = v.time_out ? new Date(v.time_out).toLocaleTimeString() : '';
        const cellDisplay = (() => {
          const cell = availableCells.find(c => c.cell_number.toLowerCase() === v.cell.toLowerCase());
          return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(v.cell)}` : capitalizeWords(v.cell);
        })();
        ws_data.push([capitalizeWords(v.visitor_name), v.contact_number, capitalizeWords(v.pdl_name), v.relationship, cellDisplay, timeIn, timeOut]);
      });

      ws_data.push([]);
    });

    // Convert ws_data to worksheet
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

    const maxCols = Math.max(...ws_data.map(row => row.length));
    const colWidths = Array.from({ length: maxCols }, (_, colIndex) => {
      let maxLength = 10;
      ws_data.forEach(row => {
        const cell = row[colIndex];
        if (cell) {
          const length = cell.toString().length;
          if (length > maxLength) maxLength = length;
        }
      });
      return { wch: maxLength + 2 };
    });

    ws['!cols'] = colWidths;

    // Set row heights for title, date heading, and header rows
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 24 }; 

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;
        if (!ws[cell_ref].s) ws[cell_ref].s = {};
        // Center align all cells
        ws[cell_ref].s.alignment = { vertical: "center", horizontal: "center" };

        // Bold font for title row (row 0)
        if (R === 0) {
          ws[cell_ref].s.font = { bold: true, sz: 14 };
        }
        // Date heading rows (every 5th row starting at 2) - normal font, left aligned, no bold
        else if ((R - 2) % 5 === 0) {
          ws[cell_ref].s.font = { bold: false, sz: 12 };
          ws[cell_ref].s.alignment = { vertical: "center", horizontal: "left" };
          ws['!rows'][R] = { hpt: 20 };
        }
        // Bold font for header rows (every 5th row starting at 3)
        else if ((R - 3) % 5 === 0) {
          if (!ws[cell_ref].s.font) ws[cell_ref].s.font = {};
          ws[cell_ref].s.font.bold = true;
          ws[cell_ref].s.font.sz = 12;
          ws[cell_ref].s.border = {
            bottom: { style: "thin", color: { rgb: "000000" } }
          };
          ws['!rows'][R] = { hpt: 18 };
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Visitor Logs');

    XLSX.writeFile(wb, 'visitor_logs_by_date.xlsx');
  };

  if (loading) {
    return (
      <div className="common-container">
        <main>
          <div className="table-wrapper">
            <SkeletonTable columns={8} rows={7} />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="common-container p-4 error-message">{error}</div>
      </>
    );
  }

  return (
    <>
      <div className="common-container">
        <main>
          {/* Filter Controls */}
            <div className="search-filter-container logs-filters">
              <div className="search-filter-grid">
                {/* Search Section */}
                <div className="search-filter-item search-group">
                  <label className="filter-label">
                    Search:
                  </label>
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      placeholder="Search visitors, PDLs, relationships..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search visitors"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="search-clear-btn"
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
                
                {/* Visit type filter */}
                <div className="search-filter-item sort-group">
                  <label htmlFor="logs-purpose-filter" className="filter-label">
                    Visit type:
                  </label>
                  <Dropdown
                    value={purposeFilter}
                    onChange={(val) => setPurposeFilter(val)}
                    ariaLabel="Filter logs by visit type"
                    minWidth={180}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'conjugal', label: 'Conjugal Visit' },
                    ]}
                  />
                </div>
                
                {/* Show Only Section */}
                <div className="search-filter-item filter-group">
                  <label className="filter-label">
                    Show Only:
                  </label>
                  <Dropdown
                    value={filterType}
                    onChange={(val) => {
                      setFilterType(val);
                      setFilterValue('');
                    }}
                    ariaLabel="Filter type"
                    minWidth={160}
                    options={[
                      { value: 'all', label: 'All Records' },
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
                      minWidth={240}
                      options={[
                        { value: '', label: `Select ${filterType}...` },
                        ...(filterType === 'year'
                          ? getUniqueYears().map((year) => ({ value: year, label: String(year) }))
                          : filterType === 'month'
                          ? getUniqueYears().map((year) =>
                              getUniqueMonths(year).map((month) => ({
                                value: `${year}-${month}`,
                                label: new Date(year, month - 1).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                }),
                              }))
                            ).flat()
                          : getUniqueYears().map((year) =>
                              getUniqueMonths(year).map((month) =>
                                getUniqueDays(year, month).map((day) => ({
                                  value: `${year}-${month}-${day}`,
                                  label: new Date(year, month - 1, day).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  }),
                                }))
                              ).flat()
                            ).flat()),
                      ]}
                    />
                  )}
                  
                  <div className="records-count-badge">
                    Showing: {sortedVisitors.length} of {allowedVisitors.length} records
                  </div>
                </div>
              </div>
            </div>
          <div className="table-wrapper" ref={tableWrapperRef}>
          <table className="common-table card-table card-first-is-name">
            <thead>
            <tr>
              <th className="sortable-th" onClick={() => onHeaderClick('visitor_name')}>Visitor's Name</th>
              <th className="sortable-th" onClick={() => onHeaderClick('contact_number')}>Contact Number</th>
              <th className="sortable-th" onClick={() => onHeaderClick('pdl_name')}>PDL Visited</th>
              <th className="sortable-th" onClick={() => onHeaderClick('relationship')}>Relationship</th>
              <th className="sortable-th" onClick={() => onHeaderClick('cell')}>Cell</th>
              <th className="sortable-th" onClick={() => onHeaderClick('time_in')}>Time In</th>
              <th className="sortable-th" onClick={() => onHeaderClick('time_out')}>Time Out</th>
              <th className="sortable-th" onClick={() => onHeaderClick('time_in')}>Date</th>
            </tr>
          </thead>
          <tbody>
            {sortedVisitors.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">No records</td>
              </tr>
            ) : (
              currentVisitors.map((v) => (
                <tr
                  key={v.id}
                  className={expandedIds.has(v.id) ? 'card-expanded' : 'card-collapsed'}
                  onClick={() => toggleCollapse(v.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td data-label="Visitor's Name">{capitalizeWords(v.visitor_name)}</td>
                  <td data-label="Contact Number">{v.contact_number}</td>
                  <td data-label="PDL Visited">{capitalizeWords(v.pdl_name)}</td>
                  <td data-label="Relationship">{v.relationship}</td>
                  <td data-label="Cell">
                    {(() => {
                      const cell = availableCells.find(c => c.cell_number.toLowerCase() === v.cell.toLowerCase());
                      return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(v.cell)}` : capitalizeWords(v.cell);
                    })()}
                  </td>
                  <td data-label="Time In">{v.time_in ? formatTimeOnly(v.time_in) : ''}</td>
                  <td data-label="Time Out">{v.time_out ? formatTimeOnly(v.time_out) : ''}</td>
                  <td data-label="Date">{v.time_in ? formatDateTime(v.time_in).split(',')[0] : ''}</td>
                  <td className="card-summary">{capitalizeWords(v.visitor_name)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        {(totalPages > 1 || pageSize === 'all') && (
          <div className="pagination-container">
            <Dropdown
              variant="pagination"
              value={String(pageSize)}
              onChange={(val) => handlePageSizeChange({ target: { value: val } })}
              ariaLabel="Rows per page"
              minWidth={140}
              align="right"
              direction="up"
              options={[
                { value: '10', label: '10 per page' },
                { value: '25', label: '25 per page' },
                { value: '50', label: '50 per page' },
                { value: '100', label: '100 per page' },
                { value: 'all', label: 'All' },
              ]}
            />
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
              {pageSize === 'all' ? `Showing all ${sortedVisitors.length} rows` : `Page ${currentPage} of ${totalPages}`}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            onClick={handleExtractTable}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 8px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#2563eb',
              textDecoration: 'underline',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => (e.target.style.color = '#1e40af')}
            onMouseLeave={(e) => (e.target.style.color = '#2563eb')}
            aria-label="Extract table grouped by date"
          >
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', flexShrink: 0 }}>
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor"/>
            </svg>
            Export to Excel
          </button>
        </div>
        </main>
      </div>
    </>
  );
};

export default Logs;
