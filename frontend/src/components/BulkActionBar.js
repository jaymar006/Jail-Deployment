import React from 'react';

const BulkActionBar = ({ count, onDelete, onExport, onClear }) => {
  if (count === 0) return null;

  return (
    <div className="bulk-action-bar">
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
        {count} selected
      </span>
      {onDelete && (
        <button className="common-button delete" onClick={onDelete} style={{ padding: '5px 12px', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      )}
      {onExport && (
        <button className="common-button export" onClick={onExport} style={{ padding: '5px 12px', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export
        </button>
      )}
      <span className="filter-chip-clear-all" onClick={onClear} style={{ marginLeft: 'auto', fontSize: 12 }}>
        Clear selection
      </span>
    </div>
  );
};

export default BulkActionBar;
