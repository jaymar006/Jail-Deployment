import React, { useEffect, useRef, useState } from 'react';
import './Dropdown.css';

const CellsDropdown = ({
  cells = [],
  isScheduled,
  isQuarantine,
  cellLabel,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const regular = cells.filter((cell) => !isQuarantine(cell));
  const quarantined = cells.filter((cell) => isQuarantine(cell));
  const scheduledCount = cells.filter((cell) => isScheduled(cell)).length;

  const renderRow = (cell, keyPrefix) => (
    <div
      key={`${keyPrefix}-${cell.id}`}
      className={`cells-dd-row${isQuarantine(cell) ? ' quarantine' : ''}`}
      role="option"
      aria-selected={isScheduled(cell)}
    >
      <span className="cells-dd-name">{cellLabel(cell)}</span>
      <span className={`cell-badge${isScheduled(cell) ? ' scheduled' : ''}`}>
        {isScheduled(cell) ? 'Scheduled' : 'Open'}
      </span>
    </div>
  );

  return (
    <div
      className={`cells-dd dd dd-time${className ? ` ${className}` : ''}`}
      ref={wrapperRef}
      data-open={open}
    >
      <button
        type="button"
        className="dd-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Scheduled cells and quarantine"
      >
        <span className="dd-value">
          Cells · {scheduledCount} scheduled today
        </span>
        <svg className="dd-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="dd-panel cells-dd-panel" role="listbox" aria-label="Scheduled cells and quarantine">
          {cells.length === 0 ? (
            <div className="cells-dd-empty">No cells configured</div>
          ) : (
            <>
              {regular.map((cell) => renderRow(cell, 'cell'))}
              {quarantined.length > 0 && (
                <>
                  <div className="cells-dd-group">Quarantine</div>
                  {quarantined.map((cell) => renderRow(cell, 'quarantine'))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CellsDropdown;
