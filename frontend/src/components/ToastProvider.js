import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

const EXIT_MS = 250;

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    clearTimeout(exitTimer.current);
    setLeaving(false);
    setToast({ id: Date.now() + Math.random(), message, type });
  }, []);

  const handleClose = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, EXIT_MS);
  }, [leaving]);

  useEffect(() => {
    return () => clearTimeout(exitTimer.current);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          zIndex: 2000,
          left: { xs: 10, sm: 'auto' },
          right: { xs: 10, sm: 20 },
          bottom: { xs: 20, sm: 20 },
          pointerEvents: 'none',
        }}
      >
        {toast && (
          <Alert
            key={toast.id}
            severity={toast.type}
            variant="filled"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: { xs: 0, sm: 280 },
              maxWidth: 480,
              borderRadius: 2,
              pointerEvents: 'auto',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              animation: leaving
                ? 'toast-exit 0.25s ease-in forwards'
                : 'toast-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
