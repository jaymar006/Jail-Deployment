import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
  const [availableCells, setAvailableCells] = useState([]);

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
      <>
        <div className="common-container">
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Visitor Logs
              </h2>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  onClick={handleExtractTable}
                  className="common-button"
                  aria-label="Extract table grouped by date"
                  style={{
                    background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(75, 85, 99, 0.2)'
                  }}
                >
                  <svg className="button-icon" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Export To Excel
                </button>
                <button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    api.get('/api/scanned_visitors')
                      .then(res => {
                        setAllowedVisitors(res.data);
                        setLoading(false);
                      })
                      .catch(err => {
                        console.error('Failed to fetch visitors:', err);
                        setError('Failed to fetch visitors data');
                        setLoading(false);
                      });
                  }}
                  className="common-button"
                  aria-label="Refresh visitor logs"
                  style={{
                    background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(75, 85, 99, 0.2)'
                  }}
                >
                  <svg className="button-icon" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </main>
        </div>
      </>
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
          <section className="p-4">
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
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Visitor Logs
              </h2>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={handleExtractTable}
                  className="common-button"
                  aria-label="Extract table grouped by date"
                  style={{
                    background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(75, 85, 99, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(75, 85, 99, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(75, 85, 99, 0.2)';
                  }}
                >
                  <svg className="button-icon" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                  Export To Excel
                </button>
              </div>
            </div>
          </section>

          <h3 style={{ textAlign: 'center', margin: '20px 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#111827' }}>Allowed Visitors</h3>

            {/* Filter Controls */}
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
                      placeholder="Search visitors, PDLs, relationships..."
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
                
                {/* Empty Middle Column - Creates Space */}
                <div></div>
                
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
                    Showing: {sortedVisitors.length} of {allowedVisitors.length} records
                  </div>
                </div>
              </div>
            </div>
          <table className="common-table">
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
                <td colSpan="8">No records</td>
              </tr>
            ) : (
              sortedVisitors.map((v) => (
                <tr key={v.id}>
                  <td>{capitalizeWords(v.visitor_name)}</td>
                  <td>{v.contact_number}</td>
                  <td>{capitalizeWords(v.pdl_name)}</td>
                  <td>{v.relationship}</td>
                  <td>
                    {(() => {
                      const cell = availableCells.find(c => c.cell_number.toLowerCase() === v.cell.toLowerCase());
                      return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(v.cell)}` : capitalizeWords(v.cell);
                    })()}
                  </td>
                  <td>{v.time_in ? formatTimeOnly(v.time_in) : ''}</td>
                  <td>{v.time_out ? formatTimeOnly(v.time_out) : ''}</td>
                  <td>{v.time_in ? formatDateTime(v.time_in).split(',')[0] : ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </main>
      </div>
    </>
  );
};

export default Logs;
