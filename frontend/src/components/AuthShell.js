import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

const AuthShell = ({ title, children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: '#f4f5f7',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2.5 }}>
        <img src="/logo1.png" alt="Logo 1" style={{ height: 64, objectFit: 'contain' }} />
        <img src="/logo2.png" alt="Logo 2" style={{ height: 64, objectFit: 'contain' }} />
        <img src="/logo3.png" alt="Logo 3" style={{ height: 64, objectFit: 'contain' }} />
      </Box>
      <Typography
        variant="h5"
        component="h1"
        align="center"
        sx={{ color: 'primary.main', maxWidth: 680, mb: 3, px: 1, lineHeight: 1.35 }}
      >
        Silang Municipal Jail Visitation Management System
      </Typography>
      <Paper
        elevation={4}
        sx={{ width: '100%', maxWidth: 440, borderRadius: 1.5, p: { xs: 3, sm: 4 } }}
      >
        {title && (
          <Typography variant="h6" align="center" sx={{ mb: 2 }}>
            {title}
          </Typography>
        )}
        {children}
      </Paper>
    </Box>
  );
};

export default AuthShell;
