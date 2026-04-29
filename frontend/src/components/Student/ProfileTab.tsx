import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Box,
  Avatar,
  Alert,
} from '@mui/material';
import {
  Person,
  School,
  CalendarToday,
  Email,
  Group,
  PhotoCamera,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { StudentProfile } from '../../types/student.types';
import { authApi } from '../../api/auth';
import { getMediaUrl } from '../../utils/media';

interface ProfileTabProps {
  profile: StudentProfile | null;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ profile }) => {
  const { enqueueSnackbar } = useSnackbar();
  const user = authApi.getCurrentUser();
  const [email, setEmail] = useState(user?.email || '');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

  const handleEmailChange = async () => {
    if (!email.trim()) {
      setEmailError('Введите email');
      return;
    }
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Введите корректный email');
      return;
    }
    setEmailError(null);
    setLoadingEmail(true);
    try {
      const updatedUser = await authApi.changeEmail(email);
      authApi.updateCurrentUser(updatedUser);
      enqueueSnackbar('Email успешно изменён', { variant: 'success' });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Ошибка смены email';
      setEmailError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      enqueueSnackbar('Можно загружать только изображения', { variant: 'warning' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      enqueueSnackbar('Размер файла не должен превышать 2 МБ', { variant: 'warning' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const updatedUser = await authApi.uploadAvatar(file);
      authApi.updateCurrentUser(updatedUser);
      setAvatarUrl(updatedUser.avatar || '');
      enqueueSnackbar('Аватар обновлён', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка загрузки', { variant: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!profile) {
    return <Typography>Профиль не загружен</Typography>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Grid container spacing={3}>
      {/* Основная информация */}
      <Grid item xs={12} md={6}>
        <Card className="profile-card">
          <CardContent>
            <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
              <Avatar
                src={getMediaUrl(avatarUrl)}
                sx={{ width: 100, height: 100, mb: 1 }}
              >
                {!avatarUrl && `${profile.first_name?.[0]}${profile.last_name?.[0]}`}
              </Avatar>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCamera />}
                disabled={uploadingAvatar}
                size="small"
              >
                {uploadingAvatar ? <CircularProgress size={24} /> : 'Загрузить аватар'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </Button>
            </Box>

            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Person sx={{ mr: 1 }} />
              Личная информация
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <List>
              <ListItem>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText
                  primary="ФИО"
                  secondary={`${profile.first_name} ${profile.last_name}`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText
                  primary="Email"
                  secondary={user?.email || 'Не указан'}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Group />
                </ListItemIcon>
                <ListItemText
                  primary="Группа"
                  secondary={profile.group_name || 'Не назначена'}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CalendarToday />
                </ListItemIcon>
                <ListItemText
                  primary="Дата регистрации"
                  secondary={formatDate(profile.created_at)}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Учебная информация и смена email */}
      <Grid item xs={12} md={6}>
        <Card className="profile-card">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <School sx={{ mr: 1 }} />
              Учебная информация
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              {user?.role === 'admin' && (
                <>
                  <Grid item xs={6}>
                    <Paper className="stats-card">
                      <Typography className="stats-value" variant="h4" color="primary">
                        {profile.group_id ? profile.group_id : '-'}
                      </Typography>
                      <Typography className="stats-label" variant="body2">
                        ID группы
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={6}>
                    <Paper className="stats-card">
                      <Typography className="stats-value" variant="h4" color="primary">
                        {profile.user_id || '-'}
                      </Typography>
                      <Typography className="stats-label" variant="body2">
                        ID пользователя
                      </Typography>
                    </Paper>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Paper className="stats-card" sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Статус учетной записи
                  </Typography>
                  <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
                    Активна
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Email sx={{ mr: 1 }} />
              Смена email
            </Typography>
            <Box mb={2}>
              <TextField
                fullWidth
                size="small"
                label="Новый email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!emailError}
                helperText={emailError}
                sx={{ mb: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleEmailChange}
                disabled={loadingEmail || email === user?.email}
              >
                {loadingEmail ? <CircularProgress size={24} /> : 'Сменить email'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ProfileTab;