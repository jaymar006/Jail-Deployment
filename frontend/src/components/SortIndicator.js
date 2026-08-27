import React from 'react';

const SortIndicator = ({ column, currentSort, direction }) => {
  if (column !== currentSort) {
    return <span className="sort-indicator">⇅</span>;
  }
  return (
    <span className={`sort-indicator active`}>
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  );
};

export default SortIndicator;
