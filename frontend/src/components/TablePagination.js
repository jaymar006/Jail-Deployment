import React from 'react';

const TablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  filteredItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  if (totalItems === 0) return null;

  const getPaginationPages = () => {
    const pages = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const getRangeText = () => {
    if (pageSize === 'all') return `Showing all ${filteredItems} records`;
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, filteredItems);
    return `Showing ${start}–${end} of ${filteredItems} records`;
  };

  const pages = getPaginationPages();

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', flexWrap: 'wrap', gap: '8px' }}>
      <span className="records-count-badge">{getRangeText()}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: 12, color: '#6b7280' }}>Rows:</span>
        <select
          className="pagination-size-select"
          value={pageSize}
          onChange={(e) => {
            const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
            onPageSizeChange(val);
            onPageChange(1);
          }}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="all">All</option>
        </select>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          <button
            className="pagination-button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="First page"
          >
            «
          </button>
          <button
            className="pagination-button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            title="Previous page"
          >
            ‹
          </button>
          {pages.map((page, i) =>
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={page}
                className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )
          )}
          <button
            className="pagination-button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Next page"
          >
            ›
          </button>
          <button
            className="pagination-button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            title="Last page"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;
