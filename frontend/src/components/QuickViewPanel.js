import React, { useEffect } from 'react';

const QuickViewPanel = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="qv-backdrop" onClick={onClose} />}
      <div className={`qv-panel ${open ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', padding: '4px 8px', borderRadius: 4 }}
            title="Close"
          >
            ×
          </button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {children}
        </div>
      </div>
    </>
  );
};

export const QVField = ({ label, value }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, color: '#111827' }}>{value || '—'}</div>
  </div>
);

export const QVSection = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #bfdbfe' }}>{title}</div>
    {children}
  </div>
);

export default QuickViewPanel;
