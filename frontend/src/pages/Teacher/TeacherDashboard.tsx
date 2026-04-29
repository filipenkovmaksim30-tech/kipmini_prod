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
  Avatar,
  Chip,
  Fade,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import TaskRoundedIcon from '@mui/icons-material/TaskRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getMediaUrl } from '../../utils/media';
import TeacherProfileTab from '../../components/Teacher/ProfileTab';
import TeacherScheduleTab from '../../components/Teacher/ScheduleTab';
import TeacherHomeworkTab from '../../components/Teacher/HomeworkTab';
import TeacherJournalTab from '../../components/Teacher/TeacherJournalTab';
import ChangePasswordTab from '../../components/Student/ChangePasswordTab';

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

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const user = authApi.getCurrentUser();

  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 5) {
        setTabValue(tabIndex);
      }
    }
  }, [tabParam]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    navigate(`/dashboard?tab=${newValue}`, { replace: true });
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  if (user?.role !== 'teacher') {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Paper sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
          <Typography variant="h5" gutterBottom>
            Недостаточно прав
          </Typography>
          <Typography paragraph>
            У вас нет доступа к панели преподавателя.
          </Typography>
          <Typography paragraph>
            Ваша роль: <strong>{user?.role}</strong>
          </Typography>
          <Button variant="contained" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            Вернуться на главную
          </Button>
          <Button variant="outlined" onClick={handleLogout}>
            Выйти
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, minHeight: '100vh' }} className="teacher-dashboard">
      <Paper sx={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        color: 'white',
        borderRadius: 4,
        marginBottom: 3,
        overflow: 'hidden',
        animation: 'fadeIn 0.35s ease-out',
      }}>
        <Grid container alignItems="center" spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
          <Grid item>
            <Avatar sx={{
              width: { xs: 72, md: 92 },
              height: { xs: 72, md: 92 },
              bgcolor: 'rgba(255,255,255,0.18)',
              color: '#fff',
              fontSize: { xs: '1.5rem', md: '1.95rem' },
              fontWeight: 700,
              border: '3px solid rgba(255,255,255,0.45)',
              boxShadow: '0 14px 28px -18px rgba(15,23,42,0.7)',
            }}
              src={getMediaUrl(user?.avatar)}
            >
              {!user?.avatar && (user?.username?.[0]?.toUpperCase() || 'П')}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'white' }}>
              Панель преподавателя
            </Typography>
            <Typography variant="body1" sx={{ color: 'white', mb: 1, opacity: 0.9 }}>
              <strong>Преподаватель:</strong> {user?.username}
            </Typography>
            <Typography variant="body2" sx={{ color: 'white', opacity: 0.8 }}>
              <strong>Email:</strong> {user?.email}
            </Typography>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Chip
              label="Преподаватель"
              sx={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
                mr: { xs: 0, sm: 2 },
                mb: { xs: 1.5, sm: 0 },
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
            <Button
              variant="contained"
              onClick={handleLogout}
              sx={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                width: { xs: '100%', sm: 'auto' },
                '&:hover': { background: 'rgba(255,255,255,0.3)' },
              }}
            >
              Выйти
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper className="teacher-tabs" sx={{
        background: 'white',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 20px 40px -26px rgba(15,23,42,0.4)',
        animation: 'fadeIn 0.45s ease-out',
      }}>
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
            '& .MuiTab-root': {
              minHeight: 48,
            },
            '& .Mui-selected': { color: '#3b82f6' },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 2,
              backgroundColor: '#3b82f6',
            }
          }}
        >
          <Tab icon={<PersonRoundedIcon fontSize="small" />} iconPosition="start" label="Профиль" />
          <Tab icon={<CalendarMonthRoundedIcon fontSize="small" />} iconPosition="start" label="Расписание" />
          <Tab icon={<LockRoundedIcon fontSize="small" />} iconPosition="start" label="Смена пароля" />
          <Tab icon={<TaskRoundedIcon fontSize="small" />} iconPosition="start" label="Домашние задания" />
          <Tab icon={<MenuBookRoundedIcon fontSize="small" />} iconPosition="start" label="Журнал" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <TeacherProfileTab />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <TeacherScheduleTab />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <ChangePasswordTab />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <TeacherHomeworkTab />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <TeacherJournalTab />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default TeacherDashboard;