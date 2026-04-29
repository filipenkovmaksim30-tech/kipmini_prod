import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CardActions,
  Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import SubjectIcon from '@mui/icons-material/Subject';
import ScheduleIcon from '@mui/icons-material/Schedule';
import GroupIcon from '@mui/icons-material/Group';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { adminApi } from '../../api/admin';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosConfig';

const StatsTab: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalGroups: 0,
    totalSubjects: 0,
    totalSchedules: 0,
  });

  // Массив быстрых действий (добавлен пункт "Преподаватели")
  const quickActions = [
    {
      title: 'Пользователи',
      description: 'Управление пользователями и ролями',
      icon: <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => navigate('/admin?tab=1'),
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'Студенты',
      description: 'Управление студентами и привязка к группам',
      icon: <SchoolIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      action: () => navigate('/admin?tab=2'),
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      title: 'Группы',
      description: 'Создание и управление учебными группами',
      icon: <GroupIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      action: () => navigate('/admin?tab=3'),
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      title: 'Предметы',
      description: 'Управление учебными предметами',
      icon: <SubjectIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      action: () => navigate('/admin?tab=4'),
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      title: 'Преподаватели',
      description: 'Управление преподавателями и их назначениями',
      icon: <AssignmentIndIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      action: () => navigate('/admin?tab=5'),
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      title: 'Расписание',
      description: 'Настройка расписания занятий',
      icon: <ScheduleIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      action: () => navigate('/admin?tab=6'),
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const userStats = await adminApi.getUserStats();

      let groups = [];
      let subjects = [];
      let schedules = [];

      try {
        const groupsRes = await axiosInstance.get('/groups/');
        groups = groupsRes.data;
      } catch (err) {
        console.log('Не удалось загрузить группы:', err);
      }

      try {
        const subjectsRes = await axiosInstance.get('/subjects/');
        subjects = subjectsRes.data;
      } catch (err) {
        console.log('Не удалось загрузить предметы:', err);
      }

      try {
        const schedulesRes = await axiosInstance.get('/schedules/');
        schedules = schedulesRes.data;
      } catch (err) {
        console.log('Не удалось загрузить расписание:', err);
      }

      const statsData = {
        totalUsers: userStats.totalUsers || 0,
        totalStudents: userStats.totalStudents || 0,
        totalTeachers: userStats.totalTeachers || 0,
        totalAdmins: userStats.totalAdmins || 0,
        activeUsers: userStats.activeUsers || 0,
        pendingUsers: userStats.pendingUsers || 0,
        totalGroups: groups.length || 0,
        totalSubjects: subjects.length || 0,
        totalSchedules: schedules.length || 0,
      };

      setStats(statsData);
    } catch (err: any) {
      console.error('Ошибка загрузки статистики:', err);
      setStats({
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalAdmins: 0,
        activeUsers: 0,
        pendingUsers: 0,
        totalGroups: 0,
        totalSubjects: 0,
        totalSchedules: 0,
      });

      if (err.response?.status !== 401) {
        setError('Ошибка загрузки статистики: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
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
      <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
        {error}
        <Button onClick={handleRefresh} sx={{ ml: 2 }} size="small">
          Повторить
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Статистика системы
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={handleRefresh} size="small">
          Обновить статистику
        </Button>
      </Box>

      {/* Основные метрики (остаются без изменений) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.totalUsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего пользователей
                  </Typography>
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 4 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SchoolIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.totalStudents}
                  </Typography>
                  <Typography variant="body2" color="text-secondary">
                    Студентов
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.totalStudents / Math.max(stats.totalUsers, 1)) * 100 || 0}
                sx={{ height: 8, borderRadius: 4 }}
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SubjectIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.totalTeachers}
                  </Typography>
                  <Typography variant="body2" color="text-secondary">
                    Преподавателей
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.totalTeachers / Math.max(stats.totalUsers, 1)) * 100 || 0}
                sx={{ height: 8, borderRadius: 4 }}
                color="warning"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="info.main">
                    {stats.totalGroups}
                  </Typography>
                  <Typography variant="body2" color="text-secondary">
                    Групп
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SubjectIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="secondary.main">
                    {stats.totalSubjects}
                  </Typography>
                  <Typography variant="body2" color="text-secondary">
                    Предметов
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats.totalSchedules}
                  </Typography>
                  <Typography variant="body2" color="text-secondary">
                    Занятий в расписании
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="stats-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.activeUsers}
                  </Typography>
                  <Typography variant="body2" color="text-secondary">
                    Активных пользователей
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100 || 0}
                sx={{ height: 8, borderRadius: 4 }}
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Дополнительная статистика (без изменений) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Активность пользователей
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Категория</TableCell>
                      <TableCell align="right">Количество</TableCell>
                      <TableCell align="right">Процент</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Активные пользователи</TableCell>
                      <TableCell align="right">{stats.activeUsers}</TableCell>
                      <TableCell align="right">
                        {stats.totalUsers > 0
                          ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
                          : '0'}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Ожидают назначения роли</TableCell>
                      <TableCell align="right">{stats.pendingUsers}</TableCell>
                      <TableCell align="right">
                        {stats.totalUsers > 0
                          ? ((stats.pendingUsers / stats.totalUsers) * 100).toFixed(1)
                          : '0'}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Администраторы</TableCell>
                      <TableCell align="right">{stats.totalAdmins}</TableCell>
                      <TableCell align="right">
                        {stats.totalUsers > 0
                          ? ((stats.totalAdmins / stats.totalUsers) * 100).toFixed(1)
                          : '0'}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Распределение по ролям
              </Typography>
              <Box sx={{ mt: 2 }}>
                {[
                  { label: 'Студенты', value: stats.totalStudents, color: 'success' },
                  { label: 'Преподаватели', value: stats.totalTeachers, color: 'warning' },
                  { label: 'Администраторы', value: stats.totalAdmins, color: 'error' },
                  { label: 'Ожидают роли', value: stats.pendingUsers, color: 'primary' },
                ].map((item, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{item.label}</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.value}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={stats.totalUsers > 0 ? (item.value / stats.totalUsers) * 100 : 0}
                      sx={{ height: 6, borderRadius: 3 }}
                      color={item.color as any}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Быстрые действия */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Быстрые действия
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 4 }}>
                <Box sx={{ mb: 2 }}>
                  {action.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="contained"
                  onClick={action.action}
                  sx={{
                    background: action.color,
                    color: 'white',
                    '&:hover': {
                      opacity: 0.9,
                    }
                  }}
                >
                  Перейти
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StatsTab;