import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Avatar,
  Fade,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { studentApi } from '../../api/student';
import { StudentProfile } from '../../types/student.types';
import { getMediaUrl } from '../../utils/media';
import ProfileTab from '../../components/Student/ProfileTab';
import StudentJournalTab from '../../components/Student/StudentJournalTab';
import ScheduleTab from '../../components/Student/ScheduleTab';
import ChangePasswordTab from '../../components/Student/ChangePasswordTab';
import AttendanceTab from '../../components/Student/AttendanceTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      <Fade in={value === index} timeout={220} unmountOnExit mountOnEnter>
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </Fade>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = authApi.getCurrentUser();

  useEffect(() => {
    if (user?.role !== 'student') {
      setLoading(false);
      return;
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setProfile(null);
        setError('Профиль студента еще не создан. Обратитесь к администратору.');
      } else {
        setError('Ошибка загрузки профиля: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  if (user?.role !== 'student') {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h5" gutterBottom>
            Недостаточно прав
          </Typography>
          <Typography paragraph>
            У вас нет доступа к панели студента.
          </Typography>
          <Typography paragraph>
            Ваша роль: <strong>{user?.role}</strong>
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Вернуться на главную
          </Button>
          <Button variant="outlined" onClick={handleLogout}>
            Выйти
          </Button>
        </Paper>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '80vh'
      }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && !profile) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={handleLogout}
          sx={{ mt: 2 }}
        >
          Выйти
        </Button>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 2, md: 4 },
        minHeight: '100vh',
      }}
      className="student-dashboard"
    >
      {/* Шапка профиля */}
      <Paper
        className="student-header"
        sx={{
          borderRadius: 4,
          mb: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          animation: 'fadeIn 0.35s ease-out',
        }}
      >
        <Grid container alignItems="center" spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
          <Grid item>
            <Avatar
              className="student-avatar"
              src={getMediaUrl(user?.avatar)}
              sx={{
                width: { xs: 72, md: 92 },
                height: { xs: 72, md: 92 },
                bgcolor: 'rgba(255,255,255,0.18)',
                border: '3px solid rgba(255,255,255,0.5)',
                color: '#fff',
                fontSize: { xs: '1.45rem', md: '1.9rem' },
                fontWeight: 700,
                boxShadow: '0 14px 28px -18px rgba(15,23,42,0.7)',
              }}
            >
              {!user?.avatar && `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#fff' }}>
              {profile?.first_name} {profile?.last_name}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95, mb: 1, color: '#fff' }}>
              <strong>Группа:</strong> {profile?.group_name || 'Не назначена'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, color: '#fff' }}>
              <strong>Email:</strong> {user?.email}
            </Typography>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button
              variant="contained"
              onClick={handleLogout}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                width: { xs: '100%', sm: 'auto' },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.3)',
                }
              }}
            >
              Выйти
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Навигация по вкладкам */}
      <Paper
        className="student-tabs"
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 20px 40px -26px rgba(15,23,42,0.4)',
          animation: 'fadeIn 0.45s ease-out',
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            px: 1,
            py: 1,
            borderBottom: '1px solid rgba(148,163,184,0.2)',
            '& .MuiTabs-flexContainer': {
              gap: 1,
            },
          }}
        >
          <Tab icon={<PersonRoundedIcon fontSize="small" />} iconPosition="start" label="Профиль" />
          <Tab icon={<CalendarMonthRoundedIcon fontSize="small" />} iconPosition="start" label="Расписание" />
          <Tab icon={<AutoStoriesRoundedIcon fontSize="small" />} iconPosition="start" label="Успеваемость" />
          <Tab icon={<FactCheckRoundedIcon fontSize="small" />} iconPosition="start" label="Посещаемость" />
          <Tab icon={<LockRoundedIcon fontSize="small" />} iconPosition="start" label="Смена пароля" />
        </Tabs>

        {/* Содержимое вкладок */}
        <TabPanel value={tabValue} index={0}>
          <ProfileTab profile={profile} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ScheduleTab groupId={profile?.group_id} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <StudentJournalTab studentId={profile?.id} groupId={profile?.group_id} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <AttendanceTab />
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <ChangePasswordTab />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default StudentDashboard;