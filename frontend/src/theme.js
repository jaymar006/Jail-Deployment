import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a',
      light: '#2563eb',
      dark: '#172554',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    success: {
      main: '#16a34a',
      light: '#dcfce7',
      dark: '#15803d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#d97706',
      light: '#fef3c7',
      dark: '#92400e',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626',
      light: '#fee2e2',
      dark: '#b91c1c',
      contrastText: '#ffffff',
    },
    info: {
      main: '#2563eb',
      light: '#dbeafe',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    background: {
      default: '#f4f5f7',
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
    },
    divider: '#e5e7eb',
  },
  typography: {
    fontFamily: ['Roboto', '"Segoe UI"', 'Arial', 'sans-serif'].join(','),
    h4: { fontWeight: 600, color: '#111827' },
    h5: { fontWeight: 600, color: '#111827' },
    h6: { fontWeight: 600, color: '#111827' },
    subtitle1: { fontWeight: 500, color: '#111827' },
    subtitle2: { fontWeight: 600, color: '#374151' },
    body1: { color: '#374151' },
    body2: { color: '#374151' },
    caption: { color: '#6b7280' },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
        sizeSmall: {
          paddingLeft: 10,
          paddingRight: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: '#f3f4f6',
          color: '#374151',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: 12,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
