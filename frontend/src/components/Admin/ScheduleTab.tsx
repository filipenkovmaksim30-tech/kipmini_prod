import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Search,
  Schedule as ScheduleIcon,
  Group,
  Person,
  Book,
  FileCopy as FileCopyIcon,
} from '@mui/icons-material';
import axiosInstance from '../../api/axiosConfig';
import { useSnackbar } from 'notistack';
import { adminApi } from '../../api/admin';
import { TeacherSimple } from '../../types/teacher.types';

interface ScheduleItem {
  id: number;
  week_num: number;
  month: number;
  day: number;
  academic_year: number | null;
  day_of_week: number;
  day_name: string;
  formatted_date: string;
  start_time: string;
  end_time: string;
  period: number | null;
  group_id: number;
  group_name: string | null;
  subject_id: number | null;
  subject_name: string | null;
  subject_code: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  classroom: string | null;
  lesson_type: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  course: number;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Teacher {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  patronymic: string;
  full_name: string;
}

const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const ScheduleTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterDay, setFilterDay] = useState<string>('');
  const [filterWeekNum, setFilterWeekNum] = useState<string>('');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');

  const [filteredTeachers, setFilteredTeachers] = useState<TeacherSimple[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:30',
    period: 1,
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    academic_year: new Date().getFullYear(),
    week_num: 1,
    group_id: '',
    subject_id: '',
    teacher_id: '',
    classroom: '',
    lesson_type: '',
    description: '',
    is_active: true,
  });

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyForm, setCopyForm] = useState({
    source_group_id: '',
    source_academic_year: new Date().getFullYear(),
    source_week_num: '',
    target_group_id: '',
    target_academic_year: new Date().getFullYear(),
    target_week_num: '',
    overwrite: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.subject_id && formData.group_id) {
      fetchFilteredTeachers(parseInt(formData.subject_id), parseInt(formData.group_id));
    } else {
      setFilteredTeachers([]);
    }
  }, [formData.subject_id, formData.group_id]);

  const fetchFilteredTeachers = async (subjectId: number, groupId: number) => {
    try {
      setLoadingTeachers(true);
      const teachers = await adminApi.getTeachersBySubjectAndGroup(subjectId, groupId);
      setFilteredTeachers(teachers);
    } catch (err) {
      console.error('Ошибка загрузки преподавателей:', err);
      setFilteredTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filterAcademicYear) params.append('academic_year', filterAcademicYear);
      if (filterMonth) params.append('month', filterMonth);
      if (filterDay) params.append('day', filterDay);
      if (filterWeekNum) params.append('week_num', filterWeekNum);
      if (selectedGroup !== 'all') params.append('group_id', selectedGroup);

      const queryString = params.toString() ? `?${params.toString()}` : '';

      const [schedulesRes, groupsRes, subjectsRes] = await Promise.all([
        axiosInstance.get(`/schedules/${queryString}`),
        axiosInstance.get('/groups/'),
        axiosInstance.get('/subjects/'),
      ]);

      let teachersRes;
      try {
        teachersRes = await axiosInstance.get('/teachers/');
        setTeachers(teachersRes.data);
      } catch (err) {
        console.log('Не удалось загрузить учителей');
      }

      setSchedules(schedulesRes.data);
      setGroups(groupsRes.data);
      setSubjects(subjectsRes.data);
    } catch (err: any) {
      setError('Ошибка загрузки данных: ' + (err.response?.data?.detail || err.message));
      enqueueSnackbar('Ошибка загрузки расписания', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule: ScheduleItem | null = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        period: schedule.period || 1,
        month: schedule.month,
        day: schedule.day,
        academic_year: schedule.academic_year || new Date().getFullYear(),
        week_num: schedule.week_num,
        group_id: schedule.group_id.toString(),
        subject_id: schedule.subject_id?.toString() || '',
        teacher_id: schedule.teacher_id?.toString() || '',
        classroom: schedule.classroom || '',
        lesson_type: schedule.lesson_type || '',
        description: schedule.description || '',
        is_active: schedule.is_active,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        day_of_week: 1,
        start_time: '09:00',
        end_time: '10:30',
        period: 1,
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        academic_year: new Date().getFullYear(),
        week_num: 1,
        group_id: '',
        subject_id: '',
        teacher_id: '',
        classroom: '',
        lesson_type: '',
        description: '',
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
  };

  const handleSubmit = async () => {
    try {
      const scheduleData = {
        ...formData,
        month: parseInt(formData.month.toString()),
        day: parseInt(formData.day.toString()),
        academic_year: parseInt(formData.academic_year.toString()),
        week_num: parseInt(formData.week_num.toString()),
        group_id: parseInt(formData.group_id),
        subject_id: formData.subject_id ? parseInt(formData.subject_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        period: formData.period ? parseInt(formData.period.toString()) : null,
      };

      if (editingSchedule) {
        await axiosInstance.patch(`/schedules/${editingSchedule.id}`, scheduleData);
        enqueueSnackbar('Расписание успешно обновлено', { variant: 'success' });
      } else {
        await axiosInstance.post('/schedules/', scheduleData);
        enqueueSnackbar('Расписание успешно создано', { variant: 'success' });
      }
      fetchData();
      handleCloseDialog();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Ошибка сохранения расписания';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleDelete = async (scheduleId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить эту запись расписания?')) {
      try {
        await axiosInstance.delete(`/schedules/${scheduleId}`);
        enqueueSnackbar('Расписание успешно удалено', { variant: 'success' });
        fetchData();
      } catch (err: any) {
        enqueueSnackbar('Ошибка удаления расписания', { variant: 'error' });
      }
    }
  };

  const handleCopySchedule = async () => {
    try {
      await axiosInstance.post('/schedules/copy', copyForm);
      enqueueSnackbar('Расписание скопировано успешно', { variant: 'success' });
      setCopyDialogOpen(false);
      fetchData();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка копирования', { variant: 'error' });
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch =
      (schedule.subject_name && schedule.subject_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (schedule.teacher_name && schedule.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (schedule.group_name && schedule.group_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (schedule.classroom && schedule.classroom.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGroup = selectedGroup === 'all' || schedule.group_id.toString() === selectedGroup;
    const matchesDay = selectedDay === 'all' || schedule.day_of_week.toString() === selectedDay;
    const matchesActive = !showActiveOnly || schedule.is_active;

    return matchesSearch && matchesGroup && matchesDay && matchesActive;
  });

  const getDayColor = () => 'text.primary';

  if (loading && schedules.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Управление расписанием</Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FileCopyIcon />}
              onClick={() => setCopyDialogOpen(true)}
              sx={{ mr: 2 }}
            >
              Копировать расписание
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
              }}
            >
              Добавить занятие
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              placeholder="Поиск..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField
              label="Месяц"
              type="number"
              size="small"
              fullWidth
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              inputProps={{ min: 1, max: 12 }}
            />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField
              label="День"
              type="number"
              size="small"
              fullWidth
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              inputProps={{ min: 1, max: 31 }}
            />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField
              label="Неделя №"
              type="number"
              size="small"
              fullWidth
              value={filterWeekNum}
              onChange={(e) => setFilterWeekNum(e.target.value)}
              inputProps={{ min: 1 }}
            />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField
              label="Уч. год"
              type="number"
              size="small"
              fullWidth
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              placeholder="2024"
            />
          </Grid>
          <Grid item xs={6} md={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>Группа</InputLabel>
              <Select
                value={selectedGroup}
                label="Группа"
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <MenuItem value="all">Все группы</MenuItem>
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={1.5}>
            <FormControl size="small" fullWidth>
              <InputLabel>День недели</InputLabel>
              <Select
                value={selectedDay}
                label="День недели"
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                <MenuItem value="all">Все дни</MenuItem>
                {dayNames.map((day, index) => (
                  <MenuItem key={index + 1} value={(index + 1).toString()}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
              <FormControlLabel
                control={
                  <Switch
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    color="primary"
                  />
                }
                label="Только активные"
              />
              <Button variant="outlined" onClick={fetchData}>
                Применить
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {schedules.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего занятий
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Group sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="secondary">
                    {new Set(schedules.map(s => s.group_id)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Групп в расписании
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Book sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {new Set(schedules.map(s => s.subject_id)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Предметов в расписании
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Person sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {new Set(schedules.map(s => s.teacher_id)).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Преподавателей
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>Дата / Время</strong></TableCell>
              <TableCell><strong>Предмет</strong></TableCell>
              <TableCell><strong>Группа</strong></TableCell>
              <TableCell><strong>Преподаватель</strong></TableCell>
              <TableCell><strong>Аудитория</strong></TableCell>
              <TableCell><strong>Неделя</strong></TableCell>
              <TableCell><strong>Статус</strong></TableCell>
              <TableCell><strong>Действия</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSchedules.length > 0 ? (
              filteredSchedules.map((schedule) => (
                <TableRow key={schedule.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ color: getDayColor(schedule.day_of_week), fontWeight: 600 }}>
                        {schedule.day_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {schedule.start_time} - {schedule.end_time}
                        {schedule.period && ` (Пара ${schedule.period})`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {schedule.formatted_date} / уч.год {schedule.academic_year}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {schedule.subject_name || 'Не указан'}
                    </Typography>
                    {schedule.subject_code && (
                      <Typography variant="caption" color="text.secondary">
                        {schedule.subject_code}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.group_name || 'Не указана'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {schedule.teacher_name ? (
                      <Typography variant="body2">
                        {schedule.teacher_name}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не назначен
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {schedule.classroom ? (
                      <Chip label={schedule.classroom} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не указана
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={`Неделя ${schedule.week_num}`} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.is_active ? 'Активно' : 'Неактивно'}
                      size="small"
                      color={schedule.is_active ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(schedule)} color="primary" size="small">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(schedule.id)} color="error" size="small">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || filterMonth || filterDay || filterWeekNum || filterAcademicYear || selectedGroup !== 'all' || selectedDay !== 'all'
                      ? 'Занятия не найдены'
                      : 'Расписание пока пустое'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования расписания */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSchedule ? 'Редактировать занятие' : 'Добавить новое занятие'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              {/* ... поля формы (оставлены без изменений) ... */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>День недели</InputLabel>
                  <Select
                    value={formData.day_of_week}
                    label="День недели"
                    onChange={(e) => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
                  >
                    {dayNames.map((day, index) => (
                      <MenuItem key={index + 1} value={index + 1}>
                        {day}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Время начала"
                  type="time"
                  fullWidth
                  size="small"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Время окончания"
                  type="time"
                  fullWidth
                  size="small"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Номер пары"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.period}
                  onChange={(e) => setFormData({...formData, period: parseInt(e.target.value) || 1})}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Месяц"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: parseInt(e.target.value) || 1})}
                  inputProps={{ min: 1, max: 12 }}
                  required
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="День"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.day}
                  onChange={(e) => setFormData({...formData, day: parseInt(e.target.value) || 1})}
                  inputProps={{ min: 1, max: 31 }}
                  required
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Учебный год"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.academic_year}
                  onChange={(e) => setFormData({...formData, academic_year: parseInt(e.target.value) || new Date().getFullYear()})}
                  required
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  label="Номер недели"
                  type="number"
                  fullWidth
                  size="small"
                  value={formData.week_num}
                  onChange={(e) => setFormData({...formData, week_num: parseInt(e.target.value) || 1})}
                  inputProps={{ min: 1 }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Группа *</InputLabel>
                  <Select
                    value={formData.group_id}
                    label="Группа *"
                    onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                    required
                  >
                    {groups.map(group => (
                      <MenuItem key={group.id} value={group.id.toString()}>
                        {group.name} (Курс {group.course})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Предмет</InputLabel>
                  <Select
                    value={formData.subject_id}
                    label="Предмет"
                    onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                  >
                    <MenuItem value="">Не выбран</MenuItem>
                    {subjects.map(subject => (
                      <MenuItem key={subject.id} value={subject.id.toString()}>
                        {subject.name} ({subject.code})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Преподаватель</InputLabel>
                  <Select
                    value={formData.teacher_id}
                    label="Преподаватель"
                    onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                    disabled={loadingTeachers}
                  >
                    <MenuItem value="">Не выбран</MenuItem>
                    {loadingTeachers ? (
                      <MenuItem value="">Загрузка...</MenuItem>
                    ) : (
                      filteredTeachers.map(teacher => (
                        <MenuItem key={teacher.teacher_id} value={teacher.teacher_id.toString()}>
                          {teacher.full_name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Аудитория"
                  fullWidth
                  size="small"
                  value={formData.classroom}
                  onChange={(e) => setFormData({...formData, classroom: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Тип занятия</InputLabel>
                  <Select
                    value={formData.lesson_type}
                    label="Тип занятия"
                    onChange={(e) => setFormData({...formData, lesson_type: e.target.value})}
                  >
                    <MenuItem value="">Не выбран</MenuItem>
                    <MenuItem value="lecture">Лекция</MenuItem>
                    <MenuItem value="practice">Практика</MenuItem>
                    <MenuItem value="lab">Лабораторная</MenuItem>
                    <MenuItem value="seminar">Семинар</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      color="primary"
                    />
                  }
                  label="Активно"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Описание"
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSchedule ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог копирования расписания */}
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Копировать расписание</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Источник</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Группа</InputLabel>
                  <Select
                    value={copyForm.source_group_id}
                    label="Группа"
                    onChange={(e) => setCopyForm({...copyForm, source_group_id: e.target.value})}
                  >
                    {groups.map(g => (
                      <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Учебный год"
                  type="number"
                  size="small"
                  fullWidth
                  value={copyForm.source_academic_year}
                  onChange={(e) => setCopyForm({...copyForm, source_academic_year: parseInt(e.target.value)})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Номер недели"
                  type="number"
                  size="small"
                  fullWidth
                  value={copyForm.source_week_num}
                  onChange={(e) => setCopyForm({...copyForm, source_week_num: e.target.value})}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" gutterBottom>Цель</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Группа</InputLabel>
                  <Select
                    value={copyForm.target_group_id}
                    label="Группа"
                    onChange={(e) => setCopyForm({...copyForm, target_group_id: e.target.value})}
                  >
                    {groups.map(g => (
                      <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Учебный год"
                  type="number"
                  size="small"
                  fullWidth
                  value={copyForm.target_academic_year}
                  onChange={(e) => setCopyForm({...copyForm, target_academic_year: parseInt(e.target.value)})}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Номер недели"
                  type="number"
                  size="small"
                  fullWidth
                  value={copyForm.target_week_num}
                  onChange={(e) => setCopyForm({...copyForm, target_week_num: e.target.value})}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={copyForm.overwrite}
                      onChange={(e) => setCopyForm({...copyForm, overwrite: e.target.checked})}
                    />
                  }
                  label="Заменить существующее расписание целевой недели"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCopySchedule} variant="contained">Копировать</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleTab;