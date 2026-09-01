import React from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AppModal from './AppModal';

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
}) => {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      tone={destructive ? 'red' : 'blue'}
      titleIcon={
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={destructive ? '#dc2626' : '#1d4ed8'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {destructive ? (
            <>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </>
          ) : (
            <>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </>
          )}
        </svg>
      }
      maxContentWidth={440}
      actions={
        <>
          <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            variant="contained"
            autoFocus
            disableElevation
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 3,
              bgcolor: destructive ? '#dc2626' : '#2563eb',
              '&:hover': { bgcolor: destructive ? '#b91c1c' : '#1d4ed8' },
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography variant="body1" sx={{ color: '#374151', lineHeight: 1.6 }}>
        {message}
      </Typography>
    </AppModal>
  );
};

export default ConfirmDialog;
