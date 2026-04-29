import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import AppRouter from './router/AppRouter';
import { theme } from './styles/ theme';

// Уберите импорт global.css отсюда
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <Router>
          <AppRouter />
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
