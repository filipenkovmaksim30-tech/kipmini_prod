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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { Edit, Assignment } from '@mui/icons-material';
import { adminApi } from '../../api/admin';
import { Teacher, TeacherAssignment, TeacherAssignmentResponse } from '../../types/teacher.types';
import { useSnackbar } from 'notistack';
import axiosInstance from '../../api/axiosConfig';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface Group {
  id: number;
  name: string;
  course: number;
}

// Функция для преобразования ответа создания в формат TeacherAssignment
const mapToTeacherAssignment = (resp: TeacherAssignmentResponse): TeacherAssignment => ({
  assignment_id: resp.id,
  subject: {
    id: resp.subject_id,
    name: resp.subject_name,
    code: '', // можно оставить пустым или запросить отдельно
    description: undefined,
  },
  group: {
    id: resp.group_id,
    name: resp.group_name,
    course: 0, // можно оставить 0 или запросить отдельно
  },
});

const TeachersTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openTeacherDialog, setOpenTeacherDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    user_id: '',
    first_name: '',
    last_name: '',
    patronymic: '',
  });

  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    subject_id: '',
    group_id: '',
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllTeachers();
      setTeachers(data);
      setError(null);
    } catch (err) {
      setError('Ошибка загрузки преподавателей');
      enqueueSnackbar('Ошибка загрузки преподавателей', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await adminApi.getUsers(1, 100, 'teacher');
      setUsers(response.users);
    } catch (err) {
      console.error('Ошибка загрузки пользователей', err);
      enqueueSnackbar('Не удалось загрузить список пользователей', { variant: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const response = await axiosInstance.get('/subjects/');
      setSubjects(response.data);
    } catch (err) {
      console.error('Ошибка загрузки предметов', err);
      enqueueSnackbar('Не удалось загрузить список предметов', { variant: 'error' });
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await axiosInstance.get('/groups/');
      setGroups(response.data);
    } catch (err) {
      console.error('Ошибка загрузки групп', err);
      enqueueSnackbar('Не удалось загрузить список групп', { variant: 'error' });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleOpenTeacherDialog = async (teacher?: Teacher) => {
    if (!teacher) {
      await fetchUsers();
    }
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherForm({
        user_id: teacher.user_id.toString(),
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        patronymic: teacher.patronymic,
      });
    } else {
      setEditingTeacher(null);
      setTeacherForm({
        user_id: '',
        first_name: '',
        last_name: '',
        patronymic: '',
      });
    }
    setOpenTeacherDialog(true);
  };

  const handleSaveTeacher = async () => {
    try {
      if (editingTeacher) {
        const updated = await adminApi.updateTeacher(editingTeacher.id, {
          first_name: teacherForm.first_name,
          last_name: teacherForm.last_name,
          patronymic: teacherForm.patronymic,
        });
        setTeachers(prev => prev.map(t => t.id === updated.id ? updated : t));
        enqueueSnackbar('Преподаватель обновлён', { variant: 'success' });
      } else {
        const created = await adminApi.createTeacher({
          user_id: parseInt(teacherForm.user_id),
          first_name: teacherForm.first_name,
          last_name: teacherForm.last_name,
          patronymic: teacherForm.patronymic,
        });
        setTeachers(prev => [...prev, created]);
        enqueueSnackbar('Преподаватель создан', { variant: 'success' });
      }
      setOpenTeacherDialog(false);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка сохранения', { variant: 'error' });
    }
  };

  const handleOpenAssignDialog = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setNewAssignment({ subject_id: '', group_id: '' });
    setOpenAssignDialog(true);

    try {
      setLoadingAssignments(true);
      await Promise.all([fetchSubjects(), fetchGroups()]);
      const data = await adminApi.getTeacherAssignments(teacher.id);
      setAssignments(data);
    } catch (err) {
      enqueueSnackbar('Ошибка загрузки данных', { variant: 'error' });
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment.subject_id || !newAssignment.group_id || !selectedTeacher) {
      enqueueSnackbar('Выберите предмет и группу', { variant: 'warning' });
      return;
    }
    try {
      const created = await adminApi.assignTeacherToSubjectGroup({
        teacher_id: selectedTeacher.id,
        subject_id: parseInt(newAssignment.subject_id),
        group_id: parseInt(newAssignment.group_id),
      });

      // Преобразуем ответ в формат TeacherAssignment
      const newAssignmentItem = mapToTeacherAssignment(created);
      setAssignments(prev => [...prev, newAssignmentItem]);
      setNewAssignment({ subject_id: '', group_id: '' });
      enqueueSnackbar('Назначение добавлено', { variant: 'success' });

      setOpenAssignDialog(false);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || err.message || 'Ошибка назначения', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Преподаватели</Typography>
        <Button variant="contained" onClick={() => handleOpenTeacherDialog()}>
          Создать преподавателя
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>User ID</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teachers.map(teacher => (
                <TableRow key={teacher.id}>
                  <TableCell>{teacher.id}</TableCell>
                  <TableCell>{teacher.full_name}</TableCell>
                  <TableCell>{teacher.user_id}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleOpenTeacherDialog(teacher)} color="primary" size="small">
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => handleOpenAssignDialog(teacher)} color="secondary" size="small">
                      <Assignment />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог создания/редактирования преподавателя */}
      <Dialog open={openTeacherDialog} onClose={() => setOpenTeacherDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTeacher ? 'Редактировать преподавателя' : 'Создать преподавателя'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {!editingTeacher && (
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Пользователь</InputLabel>
                <Select
                  value={teacherForm.user_id}
                  label="Пользователь"
                  onChange={(e) => setTeacherForm({ ...teacherForm, user_id: e.target.value })}
                  disabled={loadingUsers}
                >
                  {loadingUsers ? (
                    <MenuItem value="">Загрузка...</MenuItem>
                  ) : users.length === 0 ? (
                    <MenuItem value="">Нет доступных пользователей</MenuItem>
                  ) : (
                    users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.username} ({user.email})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            )}
            <TextField
              label="Фамилия"
              fullWidth
              size="small"
              value={teacherForm.last_name}
              onChange={(e) => setTeacherForm({ ...teacherForm, last_name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Имя"
              fullWidth
              size="small"
              value={teacherForm.first_name}
              onChange={(e) => setTeacherForm({ ...teacherForm, first_name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Отчество"
              fullWidth
              size="small"
              value={teacherForm.patronymic}
              onChange={(e) => setTeacherForm({ ...teacherForm, patronymic: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTeacherDialog(false)}>Отмена</Button>
          <Button onClick={handleSaveTeacher} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог назначений */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Назначения преподавателя {selectedTeacher?.full_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Текущие назначения:</Typography>
            {loadingAssignments ? (
              <CircularProgress size={24} />
            ) : (
              <Box sx={{ mb: 2 }}>
                {assignments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Нет назначений</Typography>
                ) : (
                  assignments.map(ass => {
                    const subjectName = ass.subject?.name || 'Неизвестный предмет';
                    const groupName = ass.group?.name || 'Неизвестная группа';
                    return (
                      <Chip
                        key={ass.assignment_id}
                        label={`${subjectName} - ${groupName}`}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    );
                  })
                )}
              </Box>
            )}

            <Typography variant="subtitle2" gutterBottom>Добавить новое назначение:</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid xs={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Предмет</InputLabel>
                  <Select
                    value={newAssignment.subject_id}
                    label="Предмет"
                    onChange={(e) => setNewAssignment({ ...newAssignment, subject_id: e.target.value })}
                    disabled={loadingSubjects}
                  >
                    {loadingSubjects ? (
                      <MenuItem value="">Загрузка...</MenuItem>
                    ) : subjects.length === 0 ? (
                      <MenuItem value="">Нет предметов</MenuItem>
                    ) : (
                      subjects.map(subj => (
                        <MenuItem key={subj.id} value={subj.id}>
                          {subj.name} ({subj.code})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Группа</InputLabel>
                  <Select
                    value={newAssignment.group_id}
                    label="Группа"
                    onChange={(e) => setNewAssignment({ ...newAssignment, group_id: e.target.value })}
                    disabled={loadingGroups}
                  >
                    {loadingGroups ? (
                      <MenuItem value="">Загрузка...</MenuItem>
                    ) : groups.length === 0 ? (
                      <MenuItem value="">Нет групп</MenuItem>
                    ) : (
                      groups.map(grp => (
                        <MenuItem key={grp.id} value={grp.id}>
                          {grp.name} (курс {grp.course})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={2}>
                <Button variant="contained" size="small" onClick={handleAddAssignment}>Добавить</Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeachersTab;