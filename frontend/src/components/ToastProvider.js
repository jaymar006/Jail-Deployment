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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          zIndex: 2000,
          left: { xs: 10, sm: 'auto' },
          right: { xs: 10, sm: 20 },
          bottom: { xs: 20, sm: 20 },
        }}
      >
        {toast && (
          <Alert
            severity={toast.type}
            variant="filled"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: 280,
              maxWidth: 480,
              borderRadius: 2,
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
