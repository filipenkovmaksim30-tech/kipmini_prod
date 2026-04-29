import React, { useState, useEffect } from 'react';
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
  Box,
  Chip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  Avatar,
} from '@mui/material';
import {
  Person,
  School,
  CalendarToday,
  Email,
  Group,
  Subject as SubjectIcon,
  PhotoCamera,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { teacherApi, TeacherProfile } from '../../api/teacher';
import { authApi } from '../../api/auth';
import { getMediaUrl } from '../../utils/media';

const ProfileTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = authApi.getCurrentUser();
  const [email, setEmail] = useState(user?.email || '');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await teacherApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      setError('Ошибка загрузки профиля: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!profile) {
    return <Typography>Профиль не найден</Typography>;
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
                {!avatarUrl && profile.full_name?.[0]?.toUpperCase()}
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
                  secondary={profile.full_name}
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
                  <CalendarToday />
                </ListItemIcon>
                <ListItemText
                  primary="Дата регистрации"
                  secondary={formatDate(profile.created_at)}
                />
              </ListItem>
            </List>

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

      {/* Назначения (предметы и группы) */}
      <Grid item xs={12} md={6}>
        <Card className="profile-card">
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <School sx={{ mr: 1 }} />
              Учебная нагрузка
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {(!profile.assignments || profile.assignments.length === 0) ? (
              <Typography variant="body2" color="text.secondary">
                Назначения отсутствуют. Обратитесь к администратору.
              </Typography>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Предметы:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Array.from(new Set(profile.assignments.map(a => a.subject.name))).map((subject, index) => (
                      <Chip
                        key={index}
                        icon={<SubjectIcon />}
                        label={subject}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Группы:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Array.from(new Set(profile.assignments.map(a => a.group.name))).map((group, index) => (
                      <Chip
                        key={index}
                        icon={<Group />}
                        label={group}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Всего назначений: {profile.assignments.length}
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ProfileTab;