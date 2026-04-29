import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
} from '@mui/material';
import {
  People,
  School,
  Schedule,
  Subject,
  Group,
  PersonAdd,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const StatsTab: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Пользователи',
      description: 'Управление пользователями и ролями',
      icon: <People sx={{ fontSize: 40, color: 'primary.main' }} />,
      action: () => navigate('/admin?tab=1'),
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'Студенты',
      description: 'Управление студентами и привязка к группам',
      icon: <School sx={{ fontSize: 40, color: 'secondary.main' }} />,
      action: () => navigate('/admin?tab=2'),
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      title: 'Группы',
      description: 'Создание и управление учебными группами',
      icon: <Group sx={{ fontSize: 40, color: 'success.main' }} />,
      action: () => navigate('/admin?tab=3'),
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      title: 'Предметы',
      description: 'Управление учебными предметами',
      icon: <Subject sx={{ fontSize: 40, color: 'warning.main' }} />,
      action: () => navigate('/admin?tab=4'),
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      title: 'Расписание',
      description: 'Настройка расписания занятий',
      icon: <Schedule sx={{ fontSize: 40, color: 'info.main' }} />,
      action: () => navigate('/admin?tab=5'),
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ];

  return (
    <Box>
      {/* Заголовок */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Быстрые действия
      </Typography>

      {/* Карточки быстрых действий */}
      <Grid container spacing={3}>
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

      {/* Статистика */}
      <Typography variant="h5" gutterBottom sx={{ mt: 5, mb: 3 }}>
        Общая статистика
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="primary" gutterBottom>
              156
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Всего пользователей
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary" gutterBottom>
              128
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Студентов
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="success" gutterBottom>
              12
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Групп
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h4" color="warning" gutterBottom>
              24
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Предметов
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StatsTab;