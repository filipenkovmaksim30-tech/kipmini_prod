// pages/WaitingPage.tsx
import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { authApi } from '../api/auth';

const WaitingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const user = authApi.getCurrentUser();

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 2 }}>
      <Box sx={{ width: '100%', textAlign: 'center', py: { xs: 2, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 5,
            background: `linear-gradient(135deg, ${theme.palette.primary.light}20 0%, ${theme.palette.secondary.light}20 100%)`,
            border: `1px solid ${theme.palette.divider}`,
            maxWidth: 600,
            mx: 'auto',
            boxShadow: '0 24px 40px -30px rgba(15,23,42,0.45)',
            animation: 'fadeIn 0.35s ease-out',
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <HourglassEmptyIcon sx={{ fontSize: 60, color: 'white' }} />
          </Box>

          <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 1.5 }}>
            Добро пожаловать, {user?.username}!
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 2.5, maxWidth: 500, mx: 'auto' }}>
            Ваша учетная запись ожидает подтверждения администратора
          </Typography>

          <CircularProgress size={54} thickness={4} sx={{ mb: 2.5 }} />

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 2.5,
              borderRadius: 3,
              background: theme.palette.background.default,
              borderLeft: `4px solid ${theme.palette.primary.main}`,
            }}
          >
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Что происходит сейчас:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • Администратор проверяет вашу учетную запись
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              • Вам будет назначена роль (Студент, Преподаватель или Администратор)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • После этого откроется доступ ко всем функциям системы
            </Typography>
          </Paper>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Обычно это занимает не более 24 часов. При возникновении вопросов обратитесь к администратору.
          </Typography>

          <Button
            variant="contained"
            onClick={handleLogout}
            sx={{
              py: 1.5,
              px: 4,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.shadows[4],
              },
            }}
          >
            Выйти из системы
          </Button>
        </Paper>

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} KipMini - Электронный журнал колледжа
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default WaitingPage;