import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authApi } from '../../api/auth';
import { useSnackbar } from 'notistack';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';

const schema = yup.object({
  username: yup.string().required('Имя пользователя обязательно'),
  password: yup.string().required('Пароль обязателен'),
});

type LoginFormData = yup.InferType<typeof schema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.login(data);
      enqueueSnackbar('Вход выполнен успешно!', { variant: 'success' });
      navigate('/dashboard');
    } catch (err: any) {
      console.log('Ошибка входа:', err); // для отладки
      let errorMessage = 'Неверное имя пользователя или пароль';
      
      if (err.response?.data) {
        // Пробуем извлечь сообщение из разных возможных полей
        errorMessage = err.response.data.detail 
                    || err.response.data.message 
                    || err.response.data.error
                    || JSON.stringify(err.response.data);
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 2 }}>
      <Box sx={{ width: '100%', py: { xs: 1, md: 2 } }}>
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            display: 'flex',
            borderRadius: 5,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            minHeight: { md: 600 },
          }}
        >
          {/* Левая часть - приветствие */}
          <Box
            sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 5,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <SchoolIcon sx={{ fontSize: 80, mb: 3, opacity: 0.9 }} />
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
              KipMini
            </Typography>
            <Typography variant="h5" sx={{ mb: 3, opacity: 0.9 }}>
              Электронный журнал колледжа
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8 }}>
              Управляйте учебным процессом, отслеживайте успеваемость и планируйте занятия
            </Typography>
          </Box>

          {/* Правая часть - форма входа */}
          <Box sx={{ flex: 1, p: { xs: 2.5, md: 4.5 } }}>
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 700, mb: 1 }}>
                Добро пожаловать
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Войдите в свою учетную запись
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'error.light',
                }}
              >
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField
                margin="normal"
                fullWidth
                label="Имя пользователя"
                autoComplete="username"
                autoFocus
                {...register('username')}
                error={!!errors.username}
                helperText={errors.username?.message}
                disabled={loading}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <TextField
                margin="normal"
                fullWidth
                label="Пароль"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={loading}
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 2,
                  mb: 1.5,
                  py: 1.35,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Войти в систему'}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  или
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Еще нет учетной записи?
                </Typography>
                <Link
                  component={RouterLink}
                  to="/register"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Зарегистрироваться
                </Link>
              </Box>
            </form>
          </Box>
        </Paper>

        {/* Информация внизу */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} KipMini - Система электронного журнала
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Версия 1.0.0
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;