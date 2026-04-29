import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
  TextField,
  Link,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { teacherApi } from '../../api/teacher';
import { ScheduleItem } from '../../types/teacher.types';
import {
  getWeekStart,
  formatDate,
  getCurrentAcademicYear,
  parseDate,
} from '../../utils/dateUtils';

const ScheduleTab: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const [dailySchedule, setDailySchedule] = useState<ScheduleItem[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, ScheduleItem[]>>({});

  useEffect(() => {
    if (tabValue === 0) {
      fetchDailySchedule();
    } else {
      fetchWeeklySchedule();
    }
  }, [tabValue, academicYear, selectedDate, weekStart]);

  const fetchDailySchedule = async () => {
    try {
      setLoading(true);
      const { month, day } = parseDate(selectedDate);
      const data = await teacherApi.getDailySchedule(academicYear, month, day);
      const sorted = [...data].sort((a, b) => a.start_time.localeCompare(b.start_time));
      setDailySchedule(sorted);
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки расписания: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySchedule = async () => {
    try {
      setLoading(true);
      const data = await teacherApi.getWeeklySchedule(academicYear, weekStart);
      setWeeklySchedule(data);
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки расписания: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const goToPrevWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - 7);
    setWeekStart(formatDate(date));
  };

  const goToNextWeek = () => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + 7);
    setWeekStart(formatDate(date));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Обновлённая функция для перехода в журнал
  const handleGroupClick = (scheduleId: number, groupId: number, groupName: string, subjectId: number | null, subjectName: string | null, date: string) => {
    if (subjectId && subjectName) {
      navigate(`/teacher/lesson-journal?group_id=${groupId}&group_name=${encodeURIComponent(groupName)}&subject_id=${subjectId}&subject_name=${encodeURIComponent(subjectName)}&schedule_id=${scheduleId}&date=${encodeURIComponent(date)}`);
    }
  };

  const getDayColor = () => 'text.primary';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Расписание
      </Typography>

      <Paper sx={{ mb: 1.5, borderRadius: 3 }} className="dashboard-panel">
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="На день" />
          <Tab label="На неделю" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 3 }} className="dashboard-panel">
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <TextField
              label="Учебный год"
              type="number"
              size="small"
              value={academicYear}
              onChange={(e) => setAcademicYear(parseInt(e.target.value) || getCurrentAcademicYear())}
              sx={{ width: 120 }}
            />
          </Grid>

          {tabValue === 0 ? (
            <Grid item>
              <TextField
                label="Дата"
                type="date"
                size="small"
                value={selectedDate}
                onChange={handleDateChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          ) : (
            <>
              <Grid item>
                <Button variant="outlined" onClick={goToPrevWeek}>
                  ← Пред. неделя
                </Button>
              </Grid>
              <Grid item>
                <Typography>
                  Неделя с {new Date(weekStart).toLocaleDateString('ru-RU')}
                </Typography>
              </Grid>
              <Grid item>
                <Button variant="outlined" onClick={goToNextWeek}>
                  След. неделя →
                </Button>
              </Grid>
            </>
          )}

          <Grid item>
            <Button variant="contained" onClick={tabValue === 0 ? fetchDailySchedule : fetchWeeklySchedule}>
              Обновить
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {tabValue === 0 ? (
        <Paper sx={{ p: 1.5, borderRadius: 3 }} className="dashboard-panel">
          <Typography variant="h6" gutterBottom>
            Расписание на {new Date(selectedDate).toLocaleDateString('ru-RU')}
          </Typography>
          {dailySchedule.length === 0 ? (
            <Typography>На выбранный день занятий нет.</Typography>
          ) : (
            dailySchedule.map((item) => (
              <Card key={item.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {item.subject_name || 'Предмет не указан'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Группа:{' '}
                        {item.group_name ? (
                          <Link
                            component="button"
                            variant="body2"
                            onClick={() => handleGroupClick(item.id, item.group_id, item.group_name || '', item.subject_id || 0, item.subject_name || '', item.formatted_date || '')}
                            sx={{
                              color: 'primary.main',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: 600,
                              '&:hover': { color: 'primary.dark' }
                            }}
                          >
                            {item.group_name}
                          </Link>
                        ) : 'Не указана'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: getDayColor(item.day_of_week) }}>
                        {item.day_name}, {item.start_time} - {item.end_time}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.formatted_date}
                      </Typography>
                      {item.classroom && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ауд. {item.classroom}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1 }}>
                        {item.lesson_type && (
                          <Chip
                            label={
                              item.lesson_type === 'lecture' ? 'Лекция' :
                              item.lesson_type === 'practice' ? 'Практика' :
                              item.lesson_type === 'lab' ? 'Лабораторная' : item.lesson_type
                            }
                            size="small"
                            sx={{ mr: 0.5 }}
                          />
                        )}
                        <Chip label={`Неделя ${item.week_num}`} size="small" />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}
        </Paper>
      ) : (
        <Paper sx={{ p: 1.5, borderRadius: 3 }} className="dashboard-panel">
          <Typography variant="h6" gutterBottom>
            Расписание на неделю
          </Typography>
          {Object.keys(weeklySchedule).length === 0 ? (
            <Typography>На этой неделе занятий нет.</Typography>
          ) : (
            Object.entries(weeklySchedule)
              .sort(([dateA], [dateB]) => {
                const [dA, mA] = dateA.split('.').map(Number);
                const [dB, mB] = dateB.split('.').map(Number);
                if (mA !== mB) return mA - mB;
                return dA - dB;
              })
              .map(([date, lessons]) => {
                const dayName = lessons[0]?.day_name || '';
                return (
                  <Box key={date} sx={{ mb: 2.5 }}>
                    <Typography variant="h6" sx={{ mb: 1, color: getDayColor(lessons[0]?.day_of_week || 1) }}>
                      {dayName}, {date}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {lessons.map((item) => (
                      <Card key={item.id} sx={{ mb: 1 }}>
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={8}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {item.subject_name || 'Предмет не указан'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Группа:{' '}
                                {item.group_name ? (
                                  <Link
                                    component="button"
                                    variant="body2"
                                    onClick={() => handleGroupClick(item.id, item.group_id, item.group_name || '', item.subject_id || 0, item.subject_name || '', item.formatted_date || '')}
                                    sx={{
                                      color: 'primary.main',
                                      textDecoration: 'underline',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      '&:hover': { color: 'primary.dark' }
                                    }}
                                  >
                                    {item.group_name}
                                  </Link>
                                ) : 'Не указана'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item.start_time} - {item.end_time}
                              </Typography>
                              {item.classroom && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  Ауд. {item.classroom}
                                </Typography>
                              )}
                              <Box sx={{ mt: 1 }}>
                                {item.lesson_type && (
                                  <Chip
                                    label={
                                      item.lesson_type === 'lecture' ? 'Лекция' :
                                      item.lesson_type === 'practice' ? 'Практика' :
                                      item.lesson_type === 'lab' ? 'Лабораторная' : item.lesson_type
                                    }
                                    size="small"
                                    sx={{ mr: 0.5 }}
                                  />
                                )}
                                <Chip label={`Неделя ${item.week_num}`} size="small" />
                              </Box>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                );
              })
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ScheduleTab;