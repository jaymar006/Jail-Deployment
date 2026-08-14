import React from 'react';
import './SkeletonTable.css';

const SkeletonTable = ({ columns = 6, rows = 7, minWidth = 900 }) => {
  const widths = [
    90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  ];
  const pickWidth = (col) => widths[(col * 7) % widths.length];
  const rowBars = (col) => {
    const w = pickWidth(col);
    const barWidth = Math.max(45, Math.min(w, 85));
    return <div className="skeleton-bar" style={{ width: `${barWidth}%` }} />;
  };

  return (
    <table className="skeleton-table" style={{ minWidth }}>
      <thead>
        <tr>
          {Array.from({ length: columns }, (_, i) => (
            <th key={i}>
              <div className="skeleton-bar" style={{ width: '70%' }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: columns }, (_, c) => (
              <td key={c}>{rowBars(c)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default SkeletonTable;
