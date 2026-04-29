// frontend/src/pages/Auth/RegisterPage.tsx
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
  IconButton,
  InputAdornment,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { authApi } from '../../api/auth';
import { useSnackbar } from 'notistack';
import SchoolIcon from '@mui/icons-material/School';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const schema = yup.object({
  email: yup.string().email('Некорректный email').required('Email обязателен'),
  username: yup.string()
    .min(3, 'Минимум 3 символа')
    .max(50, 'Максимум 50 символов')
    .required('Имя пользователя обязательно'),
  password: yup.string()
    .min(8, 'Минимум 8 символов')
    .max(50, 'Максимум 50 символов')
    .matches(/[0-9]/, 'Пароль должен содержать цифру')
    .matches(/[A-Z]/, 'Пароль должен содержать заглавную букву')
    .matches(/[a-z]/, 'Пароль должен содержать строчную букву')
    .required('Пароль обязателен'),
});

type RegisterFormData = yup.InferType<typeof schema>;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.register(data);
      enqueueSnackbar('Регистрация успешна! Теперь войдите в систему.', {
        variant: 'success'
      });
      navigate('/login');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Ошибка регистрации';
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
            minHeight: { md: 620 },
          }}
        >
          {/* Левая часть - форма */}
          <Box sx={{ flex: 1, p: { xs: 2.5, md: 4.5 } }}>
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Typography variant="h4" className="gradient-text" sx={{ fontWeight: 700, mb: 1 }}>
                Создать аккаунт
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Присоединяйтесь к системе KipMini
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
                label="Email"
                autoComplete="email"
                autoFocus
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                disabled={loading}
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
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
                label="Имя пользователя"
                autoComplete="username"
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
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('password')}
                error={!!errors.password}
                helperText={errors.password?.message}
                disabled={loading}
                InputProps={{
                  startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />

              <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 1 }}>
                  Требования к паролю:
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  • Минимум 8 символов
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  • Содержит цифры (0-9)
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  • Содержит заглавные и строчные буквы
                </Typography>
              </Box>

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
                {loading ? <CircularProgress size={24} /> : 'Создать аккаунт'}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  или
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Уже есть учетная запись?
                </Typography>
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Войти в систему
                </Link>
              </Box>
            </form>
          </Box>

          {/* Правая часть - информация */}
          <Box
            sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              p: 5,
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <SchoolIcon sx={{ fontSize: 80, mb: 3, opacity: 0.9 }} />
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
              Преимущества
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'white', mr: 2 }} />
                <Typography>Отслеживание успеваемости</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'white', mr: 2 }} />
                <Typography>Просмотр расписания</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'white', mr: 2 }} />
                <Typography>Общение с преподавателями</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'white', mr: 2 }} />
                <Typography>Безопасное хранение данных</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Информация внизу */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Регистрируясь, вы соглашаетесь с условиями использования и политикой конфиденциальности
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            © {new Date().getFullYear()} KipMini
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;