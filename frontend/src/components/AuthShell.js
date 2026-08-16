import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

const AuthShell = ({ title, subtitle, children }) => {
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
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1, sm: 1.5 },
          mb: 2.5,
          '& img': { height: { xs: 44, sm: 64 }, objectFit: 'contain' },
        }}
      >
        <img src="/logo1.png" alt="Logo 1" />
        <img src="/logo2.png" alt="Logo 2" />
        <img src="/logo3.png" alt="Logo 3" />
      </Box>
      <Typography
        variant="h5"
        component="h1"
        align="center"
        sx={{ color: 'primary.main', maxWidth: 680, mb: { xs: 2, sm: 3 }, px: 1, lineHeight: 1.35 }}
      >
        Silang Municipal Jail Visitation Management System
      </Typography>
      <Paper
        elevation={3}
        sx={{ width: '100%', maxWidth: 420, borderRadius: 3, p: { xs: 3, sm: 4 } }}
      >
        {title && (
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant="h5"
              component="h2"
              sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        )}
        {children}
      </Paper>
    </Box>
  );
};

export default AuthShell;
