import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#7c3aed',
      light: '#a78bfa',
      dark: '#5b21b6',
    },
    success: {
      main: '#10b981',
    },
    info: {
      main: '#06b6d4',
    },
    warning: {
      main: '#f59e0b',
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: '#f3f6fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    body1: {
      lineHeight: 1.45,
    },
    body2: {
      lineHeight: 1.45,
    },
    button: {
      fontWeight: 600,
      letterSpacing: 0.2,
    },
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
        },
        body: {
          background: 'linear-gradient(180deg, #f7f9fe 0%, #eef3fb 100%)',
          minHeight: '100vh',
        },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '14px',
          paddingRight: '14px',
          '@media (min-width: 600px)': {
            paddingLeft: '18px',
            paddingRight: '18px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 14,
          paddingInline: 18,
          paddingBlock: 8,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:active': {
            transform: 'translateY(1px) scale(0.99)',
          },
        },
        contained: {
          boxShadow: '0 8px 20px -10px rgba(37, 99, 235, 0.65)',
          '&:hover': {
            boxShadow: '0 14px 26px -12px rgba(37, 99, 235, 0.6)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          boxShadow: '0 10px 30px -18px rgba(15, 23, 42, 0.35)',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 18px 36px -20px rgba(15, 23, 42, 0.45)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(148, 163, 184, 0.16)',
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 8,
          backgroundColor: '#2563eb',
          transition: 'all 0.25s ease',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 52,
          borderRadius: 12,
          fontWeight: 600,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid rgba(148, 163, 184, 0.22)',
          overflowX: 'auto',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: '#f8fbff',
        },
        root: {
          borderColor: 'rgba(148, 163, 184, 0.2)',
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(37, 99, 235, 0.05)',
          },
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        TransitionProps: {
          timeout: 220,
        },
      },
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#fff',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 16px -14px rgba(37, 99, 235, 0.55)',
          },
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        margin: 'dense',
      },
    },
  },
});