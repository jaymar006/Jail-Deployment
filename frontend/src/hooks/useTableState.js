import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export default function useTableState({
  data = [],
  searchFields = [],
  defaultPageSize = 20,
  defaultSortColumn = null,
  defaultSortDirection = 'asc',
  searchDebounceMs = 300,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortColumn, setSortColumn] = useState(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState(defaultSortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, searchDebounceMs);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm, searchDebounceMs]);

  useEffect(() => { setCurrentPage(1); }, [activeFilters]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (debouncedSearch && searchFields.length > 0) {
      const term = debouncedSearch.toLowerCase();
      result = result.filter(row =>
        searchFields.some(field => {
          const val = row[field];
          return val != null && String(val).toLowerCase().includes(term);
        })
      );
    }

    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        result = result.filter(row => {
          if (typeof value === 'function') return value(row);
          return String(row[key]).toLowerCase() === String(value).toLowerCase();
        });
      }
    });

    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] ?? '';
        const bVal = b[sortColumn] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, debouncedSearch, searchFields, activeFilters, sortColumn, sortDirection]);

  const totalPages = useMemo(() =>
    pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize)),
    [filteredData.length, pageSize]
  );

  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const onSort = useCallback((column) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        return column;
      }
      setSortDirection('asc');
      return column;
    });
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectAll(prev => {
      const next = !prev;
      if (next) {
        const pageIds = paginatedData.map(r => r.id);
        setSelectedIds(prevIds => [...new Set([...prevIds, ...pageIds])]);
      } else {
        const pageIds = new Set(paginatedData.map(r => r.id));
        setSelectedIds(prevIds => prevIds.filter(id => !pageIds.has(id)));
      }
      return next;
    });
  }, [paginatedData]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectAll(false);
  }, []);

  const setFilter = useCallback((key, value) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilter = useCallback((key) => {
    setActiveFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSearchTerm('');
  }, []);

  return {
    searchTerm, setSearchTerm,
    sortColumn, sortDirection, onSort,
    currentPage, setCurrentPage,
    pageSize, setPageSize, totalPages,
    selectedIds, toggleSelect, toggleSelectAll, selectAll, clearSelection,
    activeFilters, setFilter, clearFilter, clearAllFilters,
    filteredData, paginatedData,
    totalCount: data.length,
    filteredCount: filteredData.length,
  };
}
