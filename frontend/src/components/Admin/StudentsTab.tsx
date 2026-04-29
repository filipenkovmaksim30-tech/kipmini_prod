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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit, Delete, Add, Search } from '@mui/icons-material';
import axiosInstance from '../../api/axiosConfig';
import { useSnackbar } from 'notistack';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
  group_name: string | null;
  user_id: number | null;
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  course: number;
}

const StudentsTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    group_id: '',
    user_id: '',
  });

  useEffect(() => {
    fetchStudents();
    fetchGroups();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/students/');
      setStudents(response.data);
    } catch (err: any) {
      setError('Ошибка загрузки студентов: ' + err.response?.data?.detail || err.message);
      enqueueSnackbar('Ошибка загрузки студентов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axiosInstance.get('/groups/');
      setGroups(response.data);
    } catch (err: any) {
      console.error('Ошибка загрузки групп:', err);
    }
  };

  const handleOpenDialog = (student: Student | null = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        first_name: student.first_name,
        last_name: student.last_name,
        group_id: student.group_id?.toString() || '',
        user_id: student.user_id?.toString() || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        first_name: '',
        last_name: '',
        group_id: '',
        user_id: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStudent(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingStudent) {
        // Обновление
        await axiosInstance.put(`/students/${editingStudent.id}`, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          group_id: formData.group_id ? parseInt(formData.group_id) : null,
        });
        enqueueSnackbar('Студент успешно обновлен', { variant: 'success' });
      } else {
        // Создание
        await axiosInstance.post('/students/', {
          first_name: formData.first_name,
          last_name: formData.last_name,
          group_id: formData.group_id ? parseInt(formData.group_id) : null,
          user_id: formData.user_id ? parseInt(formData.user_id) : null,
        });
        enqueueSnackbar('Студент успешно создан', { variant: 'success' });
      }
      fetchStudents();
      handleCloseDialog();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Ошибка сохранения студента';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleDelete = async (studentId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого студента? Все связанные оценки также будут удалены.')) {
      try {
        await axiosInstance.delete(`/students/${studentId}`);
        enqueueSnackbar('Студент успешно удален', { variant: 'success' });
        fetchStudents();
      } catch (err: any) {
        enqueueSnackbar('Ошибка удаления студента', { variant: 'error' });
      }
    }
  };

  // Фильтрация студентов
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGroup = selectedGroup === 'all' ||
      student.group_id?.toString() === selectedGroup;

    return matchesSearch && matchesGroup;
  });

  if (loading && students.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Заголовок и кнопки */}
      <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Управление студентами</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            Добавить студента
          </Button>
        </Box>

        {/* Фильтры */}
        <Box display="flex" gap={2}>
          <TextField
            placeholder="Поиск по имени или фамилии..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Группа</InputLabel>
            <Select
              value={selectedGroup}
              label="Группа"
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <MenuItem value="all">Все группы</MenuItem>
              {groups.map(group => (
                <MenuItem key={group.id} value={group.id.toString()}>
                  {group.name} (Курс {group.course})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Таблица студентов */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>ФИО</strong></TableCell>
              <TableCell><strong>Группа</strong></TableCell>
              <TableCell><strong>ID пользователя</strong></TableCell>
              <TableCell><strong>Дата создания</strong></TableCell>
              <TableCell><strong>Действия</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>{student.id}</TableCell>
                  <TableCell>
                    {student.first_name} {student.last_name}
                  </TableCell>
                  <TableCell>
                    {student.group_name ? (
                      <Chip
                        label={student.group_name}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не назначена
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.user_id ? (
                      <Chip
                        label={`ID: ${student.user_id}`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не привязан
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(student.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpenDialog(student)}
                      color="primary"
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(student.id)}
                      color="error"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || selectedGroup !== 'all'
                      ? 'Студенты не найдены'
                      : 'Студентов пока нет'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingStudent ? 'Редактировать студента' : 'Добавить нового студента'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              margin="dense"
              label="Имя"
              fullWidth
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Фамилия"
              fullWidth
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              required
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Группа</InputLabel>
              <Select
                value={formData.group_id}
                label="Группа"
                onChange={(e) => setFormData({...formData, group_id: e.target.value})}
              >
                <MenuItem value="">Не назначена</MenuItem>
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id.toString()}>
                    {group.name} (Курс {group.course})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="ID пользователя (опционально)"
              fullWidth
              type="number"
              value={formData.user_id}
              onChange={(e) => setFormData({...formData, user_id: e.target.value})}
              helperText="ID существующего пользователя для привязки"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.first_name || !formData.last_name}
          >
            {editingStudent ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentsTab;