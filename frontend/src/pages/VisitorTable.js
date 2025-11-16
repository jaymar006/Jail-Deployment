import React from 'react';

const VisitorTable = ({ columns, data }) => {
  return (
    <table className="visitor-table">
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th key={idx}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>No records</td>
          </tr>
        ) : (
          data.map((row, i) => (
            <tr key={i}>
              {columns.map((col, j) => (
                <td key={j}>{row[col]}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default VisitorTable;
