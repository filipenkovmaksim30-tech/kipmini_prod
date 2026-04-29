// pages/HomePage.tsx
import React from 'react';
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { authApi } from '../api/auth';

const HomePage: React.FC = () => {
  const user = authApi.getCurrentUser();

  const handleLogout = () => {
    authApi.logout();
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, minHeight: '100vh' }}>
      <Box>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 4,
            background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
            boxShadow: '0 20px 40px -28px rgba(15,23,42,0.35)',
            animation: 'fadeIn 0.35s ease-out',
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            Добро пожаловать в KipMini!
          </Typography>

          {user && (
            <>
              <Typography variant="h6" gutterBottom>
                Вы вошли как: {user.username}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Email: {user.email}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Роль: {user.role}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleLogout}
                  sx={{ borderRadius: 3 }}
                >
                  Выйти
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default HomePage;
