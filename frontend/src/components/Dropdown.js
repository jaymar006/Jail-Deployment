import React, { useEffect, useRef, useState } from 'react';
import './Dropdown.css';

const Dropdown = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  ariaLabel = 'Dropdown',
  variant = 'toolbar',
  minWidth,
  align = 'left',
  direction = 'down',
  className = '',
  disabled = false,
  name,
  required = false,
  triggerStyle,
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

  const selected = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selected ? selected.label : placeholder;

  return (
    <div
      className={`dd dd-${variant}${className ? ` ${className}` : ''}`}
      ref={wrapperRef}
      data-dropdown
      data-open={open}
      style={minWidth ? { '--dd-min-width': `${minWidth}px` } : undefined}
    >
      <button
        type="button"
        className="dd-trigger"
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        style={triggerStyle}
      >
        <span className="dd-value">{displayLabel}</span>
        <svg className="dd-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className={`dd-panel${align === 'right' ? ' dd-panel-right' : ''}${direction === 'up' ? ' dd-panel-up' : ''}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              role="option"
              aria-selected={String(opt.value) === String(value)}
              className={`dd-item${String(opt.value) === String(value) ? ' dd-item-selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              disabled={disabled}
            >
              <span className="dd-item-label">{opt.label}</span>
              {String(opt.value) === String(value) && (
                <svg className="dd-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      {name && (
        <select
          name={name}
          required={required}
          value={value}
          onChange={() => {}}
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, border: 0, padding: 0, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
};

export default Dropdown;
