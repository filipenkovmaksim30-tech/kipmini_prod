import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Avatar,
  Button,
  Chip,
  Fade,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { getMediaUrl } from '../../utils/media';
import AdminUsersTab from '../../components/Admin/UsersTab';
import AdminStatsTab from '../../components/Admin/StatsTab';
import AdminStudentsTab from '../../components/Admin/StudentsTab';
import AdminGroupsTab from '../../components/Admin/GroupsTab';
import AdminSubjectsTab from '../../components/Admin/SubjectsTab';
import AdminScheduleTab from '../../components/Admin/ScheduleTab';
import TeachersTab from '../../components/Admin/TeachersTab'; // новая вкладка
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import Diversity3RoundedIcon from '@mui/icons-material/Diversity3Rounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';

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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const user = authApi.getCurrentUser();

  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam) {
      const tabIndex = parseInt(tabParam);
      if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 6) { // теперь максимум 6
        setTabValue(tabIndex);
      }
    }
  }, [tabParam]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    navigate(`/admin?tab=${newValue}`, { replace: true });
  };

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, minHeight: '100vh' }} className="admin-dashboard">
      {/* Шапка администратора */}
      <Paper
        className="admin-header"
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
              className="admin-avatar"
              src={getMediaUrl(user?.avatar)}
              sx={{
                width: { xs: 72, md: 92 },
                height: { xs: 72, md: 92 },
                bgcolor: 'rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: { xs: '1.45rem', md: '1.9rem' },
                fontWeight: 700,
                border: '3px solid rgba(255,255,255,0.45)',
                boxShadow: '0 14px 28px -18px rgba(15,23,42,0.7)',
              }}
            >
              {!user?.avatar && (user?.username?.[0]?.toUpperCase() || 'A')}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'white' }}>
              Панель администратора
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.95)', mb: 1 }}>
              <strong>Администратор:</strong> {user?.username}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
              <strong>Email:</strong> {user?.email}
            </Typography>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Chip
              label="Администратор"
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
                '&:hover': {
                  background: 'rgba(255,255,255,0.3)',
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
        className="admin-tabs"
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
            '& .MuiTabs-flexContainer': { gap: 1 },
          }}
        >
          <Tab icon={<DashboardRoundedIcon fontSize="small" />} iconPosition="start" label="Статистика" />
          <Tab icon={<GroupRoundedIcon fontSize="small" />} iconPosition="start" label="Пользователи" />
          <Tab icon={<SchoolRoundedIcon fontSize="small" />} iconPosition="start" label="Студенты" />
          <Tab icon={<Diversity3RoundedIcon fontSize="small" />} iconPosition="start" label="Группы" />
          <Tab icon={<MenuBookRoundedIcon fontSize="small" />} iconPosition="start" label="Предметы" />
          <Tab icon={<BadgeRoundedIcon fontSize="small" />} iconPosition="start" label="Преподаватели" /> {/* новая вкладка */}
          <Tab icon={<CalendarMonthRoundedIcon fontSize="small" />} iconPosition="start" label="Расписание" />
        </Tabs>

        {/* Содержимое вкладок */}
        <TabPanel value={tabValue} index={0}>
          <AdminStatsTab />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <AdminUsersTab />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <AdminStudentsTab />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <AdminGroupsTab />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <AdminSubjectsTab />
        </TabPanel>
        <TabPanel value={tabValue} index={5}>
          <TeachersTab />
        </TabPanel>
        <TabPanel value={tabValue} index={6}>
          <AdminScheduleTab />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminDashboard;