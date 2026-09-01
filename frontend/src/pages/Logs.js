import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SkeletonTable from '../components/SkeletonTable';
import Dropdown from '../components/Dropdown';
import useTableState from '../hooks/useTableState';
import TablePagination from '../components/TablePagination';
import FilterChips from '../components/FilterChips';
import SortIndicator from '../components/SortIndicator';
import EmptyState from '../components/EmptyState';
import QuickViewPanel, { QVField, QVSection } from '../components/QuickViewPanel';
import ColumnVisibility from '../components/ColumnVisibility';
import useColumnVisibility from '../hooks/useColumnVisibility';
import './Dashboard.css';
import './common.css';
import * as XLSX from 'xlsx';

const Logs = () => {
  const [allowedVisitors, setAllowedVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [availableCells, setAvailableCells] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const tableWrapperRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickViewVisitor, setQuickViewVisitor] = useState(null);

  const table = useTableState({
    data: allowedVisitors,
    searchFields: ['visitor_name', 'pdl_name', 'relationship', 'cell', 'contact_number'],
    defaultPageSize: 20,
  });

  // Column visibility (persisted per table)
  const logColumns = [
    { key: 'visitor_name', label: 'Visitor Name' },
    { key: 'contact_number', label: 'Contact Number' },
    { key: 'pdl_name', label: 'PDL Visited' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'cell', label: 'Cell' },
    { key: 'time_in', label: 'Time In' },
    { key: 'time_out', label: 'Time Out' },
    { key: 'scan_date', label: 'Date' },
  ];
  const colVis = useColumnVisibility({
    storageKey: 'logs.visibleColumns',
    allColumns: logColumns,
  });

  const toggleCollapse = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchVisitors = async () => {
    try {
      const allowedRes = await api.get('/api/scanned_visitors');
      setAllowedVisitors(allowedRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch visitors:', err);
      setError('Failed to fetch visitors data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
    const fetchAvailableCells = async () => {
      try {
        const response = await api.get('/api/cells/active');
        setAvailableCells(response.data);
      } catch (error) {
        console.error('Failed to fetch cells:', error);
      }
    };
    fetchAvailableCells();
    const handleVisitorTimesUpdated = () => fetchVisitors();
    window.addEventListener('visitorTimesUpdated', handleVisitorTimesUpdated);
    return () => window.removeEventListener('visitorTimesUpdated', handleVisitorTimesUpdated);
  }, []);

  useEffect(() => {
    if (tableWrapperRef.current) tableWrapperRef.current.scrollTop = 0;
  }, [table.currentPage]);

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString();
  };
  const formatTimeOnly = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString();
  };
  const capitalizeWords = (str) => {
    if (!str) return '';
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  // Get unique years from visitor data
  const getUniqueYears = () => {
    const years = new Set();
    allowedVisitors.forEach(visitor => {
      if (visitor.time_in) years.add(new Date(visitor.time_in).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Get unique months from visitor data for a specific year
  const getUniqueMonths = (year) => {
    const months = new Set();
    allowedVisitors.forEach(visitor => {
      if (visitor.time_in) {
        const date = new Date(visitor.time_in);
        if (date.getFullYear() === year) months.add(date.getMonth() + 1);
      }
    });
    return Array.from(months).sort((a, b) => b - a);
  };

  // Get unique days from visitor data for a specific year and month
  const getUniqueDays = (year, month) => {
    const days = new Set();
    allowedVisitors.forEach(visitor => {
      if (visitor.time_in) {
        const date = new Date(visitor.time_in);
        if (date.getFullYear() === year && (date.getMonth() + 1) === month) {
          days.add(date.getDate());
        }
      }
    });
    return Array.from(days).sort((a, b) => b - a);
  };

  // Date filter + purpose filter (custom to this page, on top of hook's search)
  const filteredByCustom = React.useMemo(() => {
    let result = table.filteredData;
    if (filterType !== 'all' && filterValue) {
      result = result.filter(v => {
        if (!v.time_in) return false;
        const date = new Date(v.time_in);
        switch (filterType) {
          case 'year': return date.getFullYear() === parseInt(filterValue);
          case 'month': {
            const [y, m] = filterValue.split('-');
            return date.getFullYear() === parseInt(y) && (date.getMonth() + 1) === parseInt(m);
          }
          case 'day': {
            const [y, m, d] = filterValue.split('-');
            return date.getFullYear() === parseInt(y) && (date.getMonth() + 1) === parseInt(m) && date.getDate() === parseInt(d);
          }
          default: return true;
        }
      });
    }
    if (purposeFilter !== 'all') {
      result = result.filter(v => {
        const p = (v.purpose || '').toLowerCase().trim();
        if (purposeFilter === 'normal') return p === 'normal' || p === '';
        if (purposeFilter === 'conjugal') return p === 'conjugal';
        return true;
      });
    }
    return result;
  }, [table.filteredData, filterType, filterValue, purposeFilter]);

  // Apply custom sort for time fields (hook sorts as strings by default)
  const sortedVisitors = React.useMemo(() => {
    if (!table.sortColumn) return filteredByCustom;
    const arr = [...filteredByCustom];
    if (['time_in', 'time_out', 'scan_date'].includes(table.sortColumn)) {
      arr.sort((a, b) => {
        const aTime = a[table.sortColumn] ? new Date(a[table.sortColumn]).getTime() : 0;
        const bTime = b[table.sortColumn] ? new Date(b[table.sortColumn]).getTime() : 0;
        return table.sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
      });
    }
    return arr;
  }, [filteredByCustom, table.sortColumn, table.sortDirection]);

  const currentVisitors = React.useMemo(() => {
    if (table.pageSize === 'all') return sortedVisitors;
    const start = (table.currentPage - 1) * table.pageSize;
    return sortedVisitors.slice(start, start + table.pageSize);
  }, [sortedVisitors, table.currentPage, table.pageSize]);

  const resolvedTotalPages = React.useMemo(() => {
    const ps = table.pageSize === 'all' ? sortedVisitors.length : table.pageSize;
    return Math.max(1, Math.ceil(sortedVisitors.length / (ps || 1)));
  }, [sortedVisitors.length, table.pageSize]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try { await fetchVisitors(); } finally { setIsRefreshing(false); }
  };

  // CSV Export
  const handleExtractTable = () => {
    if (allowedVisitors.length === 0) { alert('No data to extract'); return; }
    const wb = XLSX.utils.book_new();
    const groupedByDate = sortedVisitors.reduce((acc, visitor) => {
      const dateKey = visitor.time_in ? new Date(visitor.time_in).toLocaleDateString() : 'Unknown Date';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(visitor);
      return acc;
    }, {});
    const ws_data = [["SILANG MUNICIPAL JAIL VISITATION MANAGEMENT SYSTEM"], []];
    Object.keys(groupedByDate).forEach(date => {
      ws_data.push([date]);
      ws_data.push(["Visitor's Name", "Contact Number", "PDL Visited", "Relationship", "Cell", "Time In", "Time Out"]);
      groupedByDate[date].forEach(v => {
        const cellDisplay = (() => {
          const cell = availableCells.find(c => c.cell_number.toLowerCase() === v.cell.toLowerCase());
          return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(v.cell)}` : capitalizeWords(v.cell);
        })();
        ws_data.push([capitalizeWords(v.visitor_name), v.contact_number, capitalizeWords(v.pdl_name), v.relationship, cellDisplay, v.time_in ? new Date(v.time_in).toLocaleTimeString() : '', v.time_out ? new Date(v.time_out).toLocaleTimeString() : '']);
      });
      ws_data.push([]);
    });
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    ws['!cols'] = Array.from({ length: 7 }, () => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Visitor Logs');
    XLSX.writeFile(wb, `visitor_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Filter chips
  const filterChips = React.useMemo(() => {
    const chips = [];
    if (table.searchTerm) chips.push({ key: 'search', label: 'Search', value: table.searchTerm });
    if (purposeFilter !== 'all') chips.push({ key: 'purpose', label: 'Visit Type', value: purposeFilter === 'normal' ? 'Normal' : 'Conjugal' });
    if (filterType !== 'all' && filterValue) {
      chips.push({ key: 'date', label: 'Date', value: filterValue });
    }
    return chips;
  }, [table.searchTerm, purposeFilter, filterType, filterValue]);

  const handleClearFilterChip = (key) => {
    if (key === 'search') table.setSearchTerm('');
    if (key === 'purpose') setPurposeFilter('all');
    if (key === 'date') { setFilterType('all'); setFilterValue(''); }
  };

  const clearAllCustom = () => {
    table.clearAllFilters();
    setPurposeFilter('all');
    setFilterType('all');
    setFilterValue('');
  };

  // Quick view open handler (collapse on mobile, quick view on desktop)
  const handleRowClick = (v) => {
    if (window.innerWidth <= 768) {
      toggleCollapse(v.id);
    } else {
      setQuickViewVisitor(v);
    }
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
    return <div className="common-container p-4 error-message">{error}</div>;
  }

  return (
    <>
      <div className="common-container">
        <main>
          <FilterChips chips={filterChips} onClear={handleClearFilterChip} onClearAll={clearAllCustom} />

          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <input
                type="text"
                className="table-search-input"
                placeholder="Search visitors, PDLs, relationships..."
                value={table.searchTerm}
                onChange={(e) => table.setSearchTerm(e.target.value)}
                aria-label="Search visitors"
              />
            </div>
            <div className="table-toolbar-right">
              <div className="table-toolbar-actions">
                <button className={`toolbar-icon-btn ${isRefreshing ? 'spinning' : ''}`} onClick={handleRefresh} disabled={isRefreshing} title="Refresh data">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                </button>
                <button className="toolbar-icon-btn" onClick={handleExtractTable} title="Export to Excel">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </button>
                <ColumnVisibility
                  columns={logColumns}
                  isVisible={colVis.isVisible}
                  onToggle={colVis.toggleColumn}
                  onShowAll={() => colVis.setAll(true)}
                  onHideAll={() => colVis.setAll(false)}
                  align="right"
                />
              </div>
              <Dropdown
                value={purposeFilter}
                onChange={(val) => setPurposeFilter(val)}
                ariaLabel="Filter logs by visit type"
                minWidth={140}
                options={[
                  { value: 'all', label: 'All Visits' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'conjugal', label: 'Conjugal' },
                ]}
              />
              <Dropdown
                value={filterType}
                onChange={(val) => { setFilterType(val); setFilterValue(''); }}
                ariaLabel="Filter type"
                minWidth={150}
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
                  minWidth={210}
                  options={[
                    { value: '', label: `Select ${filterType}...` },
                    ...(filterType === 'year'
                      ? getUniqueYears().map(y => ({ value: y, label: String(y) }))
                      : filterType === 'month'
                      ? getUniqueYears().flatMap(y => getUniqueMonths(y).map(m => ({ value: `${y}-${m}`, label: new Date(y, m - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) })))
                      : getUniqueYears().flatMap(y => getUniqueMonths(y).flatMap(m => getUniqueDays(y, m).map(d => ({ value: `${y}-${m}-${d}`, label: new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }))))),
                  ]}
                />
              )}
            </div>
          </div>

          <div className="table-wrapper" ref={tableWrapperRef}>
            {sortedVisitors.length === 0 && !loading ? (
              <EmptyState
                title="No visitation logs found"
                description="Try adjusting your search or filters."
                actionLabel="Clear filters"
                onAction={clearAllCustom}
              />
            ) : (
              <table className="common-table card-table card-first-is-name">
                <thead>
                  <tr>
                    {colVis.isVisible('visitor_name') && <th className="sortable-th" onClick={() => table.onSort('visitor_name')}>Visitor's Name <SortIndicator column="visitor_name" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('contact_number') && <th className="sortable-th" onClick={() => table.onSort('contact_number')}>Contact Number <SortIndicator column="contact_number" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('pdl_name') && <th className="sortable-th" onClick={() => table.onSort('pdl_name')}>PDL Visited <SortIndicator column="pdl_name" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('relationship') && <th className="sortable-th" onClick={() => table.onSort('relationship')}>Relationship <SortIndicator column="relationship" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('cell') && <th className="sortable-th" onClick={() => table.onSort('cell')}>Cell <SortIndicator column="cell" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('time_in') && <th className="sortable-th" onClick={() => table.onSort('time_in')}>Time In <SortIndicator column="time_in" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('time_out') && <th className="sortable-th" onClick={() => table.onSort('time_out')}>Time Out <SortIndicator column="time_out" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                    {colVis.isVisible('scan_date') && <th className="sortable-th" onClick={() => table.onSort('time_in')}>Date <SortIndicator column="time_in" currentSort={table.sortColumn} direction={table.sortDirection} /></th>}
                  </tr>
                </thead>
                <tbody>
                  {currentVisitors.map((v) => (
                    <tr
                      key={v.id}
                      className={expandedIds.has(v.id) ? 'card-expanded' : 'card-collapsed'}
                      onClick={() => handleRowClick(v)}
                      style={{ cursor: 'pointer' }}
                    >
                      {colVis.isVisible('visitor_name') && <td data-label="Visitor's Name" style={{ color: '#2563eb', fontWeight: 500 }}>{capitalizeWords(v.visitor_name)}</td>}
                      {colVis.isVisible('contact_number') && <td data-label="Contact Number">{v.contact_number}</td>}
                      {colVis.isVisible('pdl_name') && <td data-label="PDL Visited" style={{ color: '#2563eb', fontWeight: 500 }}>{capitalizeWords(v.pdl_name)}</td>}
                      {colVis.isVisible('relationship') && <td data-label="Relationship">{v.relationship}</td>}
                      {colVis.isVisible('cell') && (
                        <td data-label="Cell">
                          {(() => {
                            const cell = availableCells.find(c => c.cell_number.toLowerCase() === v.cell.toLowerCase());
                            return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(v.cell)}` : capitalizeWords(v.cell);
                          })()}
                        </td>
                      )}
                      {colVis.isVisible('time_in') && <td data-label="Time In">{v.time_in ? formatTimeOnly(v.time_in) : ''}</td>}
                      {colVis.isVisible('time_out') && <td data-label="Time Out">{v.time_out ? formatTimeOnly(v.time_out) : ''}</td>}
                      {colVis.isVisible('scan_date') && <td data-label="Date">{v.time_in ? formatDateTime(v.time_in).split(',')[0] : ''}</td>}
                      <td className="card-summary">{capitalizeWords(v.visitor_name)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {sortedVisitors.length > 0 && (
            <TablePagination
              currentPage={table.currentPage}
              totalPages={resolvedTotalPages}
              totalItems={allowedVisitors.length}
              filteredItems={sortedVisitors.length}
              pageSize={table.pageSize}
              onPageChange={table.setCurrentPage}
              onPageSizeChange={table.setPageSize}
            />
          )}
        </main>
      </div>

      <QuickViewPanel
        open={!!quickViewVisitor}
        onClose={() => setQuickViewVisitor(null)}
        title="Visit Details"
      >
        {quickViewVisitor && (
          <>
            <QVSection title="Visitor Information">
              <QVField label="Visitor Name" value={capitalizeWords(quickViewVisitor.visitor_name)} />
              <QVField label="Contact Number" value={quickViewVisitor.contact_number} />
              <QVField label="Relationship" value={quickViewVisitor.relationship} />
            </QVSection>
            <QVSection title="PDL Information">
              <QVField label="PDL Visited" value={capitalizeWords(quickViewVisitor.pdl_name)} />
              <QVField label="Cell" value={(() => {
                const cell = availableCells.find(c => c.cell_number.toLowerCase() === quickViewVisitor.cell.toLowerCase());
                return cell && cell.cell_name ? `${cell.cell_name} - ${capitalizeWords(quickViewVisitor.cell)}` : capitalizeWords(quickViewVisitor.cell);
              })()} />
            </QVSection>
            <QVSection title="Visit Details">
              <QVField label="Purpose" value={quickViewVisitor.purpose ? capitalizeWords(quickViewVisitor.purpose) : 'Normal'} />
              <QVField label="Time In" value={quickViewVisitor.time_in ? formatDateTime(quickViewVisitor.time_in) : '—'} />
              <QVField label="Time Out" value={quickViewVisitor.time_out ? formatDateTime(quickViewVisitor.time_out) : '—'} />
              <QVField label="Scan Date" value={quickViewVisitor.scan_date ? formatDateTime(quickViewVisitor.scan_date) : '—'} />
            </QVSection>
          </>
        )}
      </QuickViewPanel>
    </>
  );
};

export default Logs;
