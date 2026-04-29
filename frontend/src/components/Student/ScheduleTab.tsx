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
} from '@mui/material';
import { studentApi } from '../../api/student';
import { ScheduleItem } from '../../types/student.types';
import { AttendanceStatus } from '../../types/attendance.types';
import { Attachment } from '@mui/icons-material';
import {
  getWeekStart,
  formatDate,
  getCurrentAcademicYear,
  parseDate,
} from '../../utils/dateUtils';
import axiosInstance from '../../api/axiosConfig';
import { useSnackbar } from 'notistack';
import { getFileIcon } from '../../utils/fileIcons';

interface ScheduleTabProps {
  groupId?: number | null;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ groupId }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [dailySchedule, setDailySchedule] = useState<ScheduleItem[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, ScheduleItem[]>>({});
  const [homeworks, setHomeworks] = useState<Record<number, { text: string; files: any[] }>>({});
  const [lessonGrades, setLessonGrades] = useState<Record<number, any[]>>({});
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});

  const loadHomework = async (scheduleId: number) => {
    try {
      const hw = await studentApi.getHomeworkForSchedule(scheduleId);
      if (hw) {
        let files: any[] = [];
        try {
          files = await studentApi.getHomeworkFiles(hw.id);
        } catch (err) {
          console.error(`Ошибка загрузки файлов для ДЗ ${hw.id}:`, err);
        }
        setHomeworks(prev => ({ ...prev, [scheduleId]: { text: hw.text, files } }));
      }
    } catch (err) {
      console.error(`Ошибка загрузки ДЗ для занятия ${scheduleId}:`, err);
    }
  };

  const loadLessonGrades = async (scheduleId: number) => {
    try {
      const grades = await studentApi.getLessonGradesForSchedule(scheduleId);
      if (grades.length > 0) {
        setLessonGrades(prev => ({ ...prev, [scheduleId]: grades }));
      }
    } catch (err) {
      console.error(`Ошибка загрузки оценок для занятия ${scheduleId}:`, err);
    }
  };

  const loadAttendance = async (scheduleId: number) => {
    try {
      const status = await studentApi.getMyAttendanceForSchedule(scheduleId);
      if (status) {
        setAttendance(prev => ({ ...prev, [scheduleId]: status }));
      }
    } catch (err) {
      console.error(`Ошибка загрузки посещаемости для занятия ${scheduleId}:`, err);
    }
  };

  useEffect(() => {
    if (!groupId) return;
    if (tabValue === 0) {
      fetchDailySchedule();
    } else {
      fetchWeeklySchedule();
    }
  }, [groupId, tabValue, academicYear, selectedDate, weekStart]);

  const fetchDailySchedule = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const { month, day } = parseDate(selectedDate);
      const data = await studentApi.getDailySchedule(academicYear, month, day);
      const sorted = [...data].sort((a, b) => a.start_time.localeCompare(b.start_time));
      setDailySchedule(sorted);
      sorted.forEach(item => {
        loadHomework(item.id);
        loadLessonGrades(item.id);
        loadAttendance(item.id);
      });
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки расписания: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklySchedule = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await studentApi.getWeeklySchedule(academicYear, weekStart);
      setWeeklySchedule(data);
      const allLessons = Object.values(data).flat();
      allLessons.forEach(item => {
        loadHomework(item.id);
        loadLessonGrades(item.id);
        loadAttendance(item.id);
      });
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

  const getAttendanceLabel = (status: AttendanceStatus): string => {
    switch (status) {
      case 'absent': return 'Н';
      case 'absent_excused': return 'Н';
      case 'absent_sick': return 'Н';
      case 'late': return 'ОП';
      default: return '';
    }
  };

  const getAttendanceColor = (status: AttendanceStatus): 'error' | 'info' | 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'absent': return 'error';
      case 'absent_excused': return 'info';
      case 'absent_sick': return 'success';
      case 'late': return 'warning';
      default: return 'default';
    }
  };

  if (!groupId) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography>Вы не привязаны к группе. Обратитесь к администратору.</Typography>
      </Paper>
    );
  }

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

      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="На день" />
          <Tab label="На неделю" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
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
        <Paper sx={{ p: 2, borderRadius: 2 }}>
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
                        {item.teacher_name || 'Преподаватель не указан'}
                      </Typography>
                      {item.group_name && (
                        <Typography variant="body2" color="text.secondary">
                          Группа: {item.group_name}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.start_time} - {item.end_time}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        {item.day_name}, {item.formatted_date}
                      </Typography>
                      {item.classroom && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Ауд. {item.classroom}
                        </Typography>
                      )}
                      {item.lesson_type && (
                        <Chip
                          label={
                            item.lesson_type === 'lecture' ? 'Лекция' :
                            item.lesson_type === 'practice' ? 'Практика' :
                            item.lesson_type === 'lab' ? 'Лабораторная' :
                            item.lesson_type
                          }
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {lessonGrades[item.id] && lessonGrades[item.id].length > 0 && (
                      <Box sx={{ p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Оценки:</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          {lessonGrades[item.id].map(grade => (
                            <Chip
                              key={grade.id}
                              label={grade.grade}
                              color={grade.grade >= 4 ? 'success' : grade.grade === 3 ? 'warning' : 'error'}
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    {attendance[item.id] && (
                      <Box sx={{ p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Посещаемость:</strong>
                        </Typography>
                        <Chip
                          label={getAttendanceLabel(attendance[item.id])}
                          color={getAttendanceColor(attendance[item.id])}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    )}
                  </Box>
                  {homeworks[item.id] && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Домашнее задание:</strong>
                      </Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {homeworks[item.id].text}
                      </Typography>
                      {homeworks[item.id].files && homeworks[item.id].files.length > 0 && (
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            <strong>Прикреплённые файлы:</strong>
                          </Typography>
                          {homeworks[item.id].files.map(file => {
                            const FileIcon = getFileIcon(file.filename);
                            return (
                              <Button
                                key={file.id}
                                size="small"
                                startIcon={<FileIcon />}
                                onClick={async () => {
                                  try {
                                    const response = await axiosInstance.get(`/download/${file.id}`, {
                                      responseType: 'blob',
                                    });
                                    const blob = response.data;
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = file.filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  } catch (err) {
                                    console.error('Ошибка скачивания:', err);
                                    enqueueSnackbar('Не удалось скачать файл', { variant: 'error' });
                                  }
                                }}
                                sx={{ mr: 1, mb: 0.5 }}
                              >
                                {file.filename}
                              </Button>
                            );
                          })}
                        </>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Paper>
      ) : (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
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
                  <Box key={date} sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
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
                                {item.teacher_name || 'Преподаватель не указан'}
                              </Typography>
                              {item.group_name && (
                                <Typography variant="body2" color="text.secondary">
                                  Группа: {item.group_name}
                                </Typography>
                              )}
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
                              {item.lesson_type && (
                                <Chip
                                  label={
                                    item.lesson_type === 'lecture' ? 'Лекция' :
                                    item.lesson_type === 'practice' ? 'Практика' :
                                    item.lesson_type === 'lab' ? 'Лабораторная' :
                                    item.lesson_type
                                  }
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                              )}
                            </Grid>
                          </Grid>
                          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {lessonGrades[item.id] && lessonGrades[item.id].length > 0 && (
                              <Box sx={{ p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Оценки:</strong>
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                  {lessonGrades[item.id].map(grade => (
                                    <Chip
                                      key={grade.id}
                                      label={grade.grade}
                                      color={grade.grade >= 4 ? 'success' : grade.grade === 3 ? 'warning' : 'error'}
                                      size="small"
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            {attendance[item.id] && (
                              <Box sx={{ p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  <strong>Посещаемость:</strong>
                                </Typography>
                                <Chip
                                  label={getAttendanceLabel(attendance[item.id])}
                                  color={getAttendanceColor(attendance[item.id])}
                                  size="small"
                                  sx={{ mt: 0.5 }}
                                />
                              </Box>
                            )}
                          </Box>
                          {homeworks[item.id] && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Домашнее задание:</strong>
                              </Typography>
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {homeworks[item.id].text}
                              </Typography>
                              {homeworks[item.id].files && homeworks[item.id].files.length > 0 && (
                                <>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    <strong>Прикреплённые файлы:</strong>
                                  </Typography>
                                  {homeworks[item.id].files.map(file => {
                                    const FileIcon = getFileIcon(file.filename);
                                    return (
                                      <Button
                                        key={file.id}
                                        size="small"
                                        startIcon={<FileIcon />}
                                        onClick={async () => {
                                          try {
                                            const response = await axiosInstance.get(`/download/${file.id}`, {
                                              responseType: 'blob',
                                            });
                                            const blob = response.data;
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = file.filename;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                          } catch (err) {
                                            console.error('Ошибка скачивания:', err);
                                            enqueueSnackbar('Не удалось скачать файл', { variant: 'error' });
                                          }
                                        }}
                                        sx={{ mr: 1, mb: 0.5 }}
                                      >
                                        {file.filename}
                                      </Button>
                                    );
                                  })}
                                </>
                              )}
                            </Box>
                          )}
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