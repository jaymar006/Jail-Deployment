import React from 'react';

const FilterChips = ({ chips = [], onClear, onClearAll }) => {
  if (chips.length === 0) return null;

  return (
    <div className="filter-chip-row">
      {chips.map((chip) => (
        <span key={chip.key} className="filter-chip">
          <span style={{ fontWeight: 500 }}>{chip.label}:</span> {chip.value}
          <span
            className="filter-chip-x"
            onClick={() => onClear(chip.key)}
            title={`Remove ${chip.label} filter`}
          >
            ×
          </span>
        </span>
      ))}
      {chips.length > 1 && (
        <span className="filter-chip-clear-all" onClick={onClearAll}>
          Clear all
        </span>
      )}
    </div>
  );
};

export default FilterChips;
