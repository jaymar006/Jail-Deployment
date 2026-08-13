import React, { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now() + Math.random(), message, type });
  }, []);

  const handleClose = () => setToast(null);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar
        key={toast?.id}
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ zIndex: 2000 }}
      >
        {toast && (
          <Alert
            onClose={handleClose}
            severity={toast.type}
            variant="filled"
            sx={{ minWidth: 280, maxWidth: 480, borderRadius: 2 }}
          >
            {toast.message}
          </Alert>
        )}
      </Snackbar>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
