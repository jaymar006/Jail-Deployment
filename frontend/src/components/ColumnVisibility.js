import React, { useEffect, useRef, useState } from 'react';

const ColumnVisibility = ({
  columns = [],
  isVisible,
  onToggle,
  onShowAll,
  onHideAll,
  align = 'left',
  hasShowAll = true,
  title = 'Columns',
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

  return (
    <div
      className="colvis"
      ref={wrapperRef}
      data-dropdown
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        type="button"
        className={`toolbar-icon-btn colvis-trigger${open ? ' active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Toggle columns"
        title="Toggle columns"
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="18" y2="6.01"/>
          <path d="M21 3H3v18h18V3z"/>
          <path d="M9 3v18M15 3v18"/>
        </svg>
      </button>

      {open && (
        <div className={`colvis-panel${align === 'right' ? ' colvis-panel-right' : ''}`}>
          <div className="colvis-header">{title}</div>
          {hasShowAll && (
            <div className="colvis-actions">
              <button
                type="button"
                className="colvis-action"
                onClick={() => { onShowAll && onShowAll(); }}
              >
                Show All
              </button>
              <button
                type="button"
                className="colvis-action"
                onClick={() => { onHideAll && onHideAll(); }}
              >
                Hide All
              </button>
            </div>
          )}
          <div className="colvis-list">
            {columns.map((col) => {
              const checked = isVisible(col.key);
              return (
                <label key={col.key} className="colvis-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(col.key)}
                  />
                  <span className="colvis-label">{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnVisibility;
