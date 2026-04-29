import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSnackbar } from 'notistack';

const schema = yup.object({
  old_password: yup.string().required('Текущий пароль обязателен'),
  new_password: yup.string()
    .min(8, 'Минимум 8 символов')
    .max(50, 'Максимум 50 символов')
    .matches(/[0-9]/, 'Пароль должен содержать цифру')
    .matches(/[A-Z]/, 'Пароль должен содержать заглавную букву')
    .matches(/[a-z]/, 'Пароль должен содержать строчную букву')
    .notOneOf([yup.ref('old_password')], 'Новый пароль должен отличаться от старого')
    .required('Новый пароль обязателен'),
  confirm_password: yup.string()
    .oneOf([yup.ref('new_password')], 'Пароли должны совпадать')
    .required('Подтверждение пароля обязательно'),
});

type ChangePasswordFormData = yup.InferType<typeof schema>;

const ChangePasswordTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          old_password: data.old_password,
          new_password: data.new_password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при смене пароля');
      }

      setSuccess(true);
      reset();
      enqueueSnackbar('Пароль успешно изменен!', { variant: 'success' });
    } catch (err: any) {
      const errorMessage = err.message || 'Ошибка при смене пароля';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper className="password-form">
      <Typography variant="h5" gutterBottom>
        Смена пароля
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Для безопасности вашего аккаунта регулярно меняйте пароль.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          Пароль успешно изменен!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <TextField
          margin="normal"
          fullWidth
          label="Текущий пароль"
          type="password"
          {...register('old_password')}
          error={!!errors.old_password}
          helperText={errors.old_password?.message}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        <TextField
          margin="normal"
          fullWidth
          label="Новый пароль"
          type="password"
          {...register('new_password')}
          error={!!errors.new_password}
          helperText={errors.new_password?.message}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        <TextField
          margin="normal"
          fullWidth
          label="Подтвердите новый пароль"
          type="password"
          {...register('confirm_password')}
          error={!!errors.confirm_password}
          helperText={errors.confirm_password?.message}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />

        <Box sx={{ mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Сменить пароль'}
          </Button>
        </Box>
      </form>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Требования к паролю:</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" component="ul" sx={{ pl: 2, mt: 1 }}>
          <li>Минимум 8 символов</li>
          <li>Содержит цифры</li>
          <li>Содержит заглавные и строчные буквы</li>
          <li>Не должен совпадать со старым паролем</li>
        </Typography>
      </Box>
    </Paper>
  );
};

export default ChangePasswordTab;