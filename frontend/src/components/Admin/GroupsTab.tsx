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
} from '@mui/material';
import { Edit, Delete, Add, People, Search, School } from '@mui/icons-material';
import axiosInstance from '../../api/axiosConfig';
import { useSnackbar } from 'notistack';

interface Group {
  id: number;
  name: string;
  course: number;
  created_at: string;
  student_count?: number;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
}

const GroupsTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStudentsDialog, setOpenStudentsDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupStudents, setGroupStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    course: 1,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/groups/');
      // Для каждой группы получаем количество студентов
      const groupsWithCounts = await Promise.all(
        response.data.map(async (group: Group) => {
          try {
            const studentsResponse = await axiosInstance.get(`/groups/${group.name}/students`);
            return {
              ...group,
              student_count: studentsResponse.data.length || 0,
            };
          } catch (err) {
            return {
              ...group,
              student_count: 0,
            };
          }
        })
      );
      setGroups(groupsWithCounts);
    } catch (err: any) {
      setError('Ошибка загрузки групп: ' + (err.response?.data?.detail || err.message));
      enqueueSnackbar('Ошибка загрузки групп', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupStudents = async (groupName: string) => {
    try {
      const response = await axiosInstance.get(`/groups/${groupName}/students`);
      setGroupStudents(response.data);
    } catch (err: any) {
      enqueueSnackbar('Ошибка загрузки студентов группы', { variant: 'error' });
    }
  };

  const handleOpenDialog = (group: Group | null = null) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        course: group.course,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        course: 1,
      });
    }
    setOpenDialog(true);
  };

  const handleOpenStudentsDialog = async (group: Group) => {
    setSelectedGroup(group);
    await fetchGroupStudents(group.name);
    setOpenStudentsDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGroup(null);
  };

  const handleCloseStudentsDialog = () => {
    setOpenStudentsDialog(false);
    setSelectedGroup(null);
    setGroupStudents([]);
  };

  const handleSubmit = async () => {
    try {
      if (editingGroup) {
        // Обновление
        await axiosInstance.patch(`/groups/${editingGroup.id}`, {
          name: formData.name,
          course: formData.course,
        });
        enqueueSnackbar('Группа успешно обновлена', { variant: 'success' });
      } else {
        // Создание
        await axiosInstance.post('/groups/', {
          name: formData.name,
          course: formData.course,
        });
        enqueueSnackbar('Группа успешно создана', { variant: 'success' });
      }
      fetchGroups();
      handleCloseDialog();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Ошибка сохранения группы';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleDelete = async (groupId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить эту группу? Все связанные студенты будут откреплены от группы.')) {
      try {
        await axiosInstance.delete(`/groups/${groupId}`);
        enqueueSnackbar('Группа успешно удалена', { variant: 'success' });
        fetchGroups();
      } catch (err: any) {
        enqueueSnackbar('Ошибка удаления группы', { variant: 'error' });
      }
    }
  };

  // Фильтрация групп
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.course.toString().includes(searchTerm)
  );

  if (loading && groups.length === 0) {
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
          <Typography variant="h5">Управление группами</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            Добавить группу
          </Button>
        </Box>

        {/* Поиск */}
        <TextField
          placeholder="Поиск по названию или курсу..."
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
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Карточки с общей статистикой */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <School sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {groups.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего групп
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
                <People sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="secondary">
                    {groups.reduce((acc, group) => acc + (group.student_count || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего студентов
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
                <School sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="success.main">
                    {Math.max(...groups.map(g => g.course), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Максимальный курс
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
                <People sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {groups.length > 0 ?
                      (groups.reduce((acc, group) => acc + (group.student_count || 0), 0) / groups.length).toFixed(1)
                      : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Среднее кол-во студентов
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица групп */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Название группы</strong></TableCell>
              <TableCell><strong>Курс</strong></TableCell>
              <TableCell><strong>Количество студентов</strong></TableCell>
              <TableCell><strong>Дата создания</strong></TableCell>
              <TableCell><strong>Действия</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <TableRow key={group.id} hover>
                  <TableCell>{group.id}</TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {group.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${group.course} курс`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Button
                        startIcon={<People />}
                        onClick={() => handleOpenStudentsDialog(group)}
                        sx={{ textTransform: 'none' }}
                      >
                        {group.student_count || 0} студентов
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(group.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpenDialog(group)}
                      color="primary"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(group.id)}
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
                    {searchTerm ? 'Группы не найдены' : 'Групп пока нет'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования группы */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingGroup ? 'Редактировать группу' : 'Добавить новую группу'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              margin="dense"
              label="Название группы"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              sx={{ mb: 2 }}
              helperText="Уникальное название группы (например, 'ИСП-21')"
            />
            <TextField
              margin="dense"
              label="Курс"
              type="number"
              fullWidth
              value={formData.course}
              onChange={(e) => setFormData({...formData, course: parseInt(e.target.value) || 1})}
              required
              inputProps={{ min: 1, max: 5 }}
              helperText="Курс обучения (от 1 до 5)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || formData.course < 1 || formData.course > 5}
          >
            {editingGroup ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог просмотра студентов группы */}
      <Dialog
        open={openStudentsDialog}
        onClose={handleCloseStudentsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Студенты группы: {selectedGroup?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body1" gutterBottom>
              Всего студентов: {groupStudents.length}
            </Typography>

            {groupStudents.length > 0 ? (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>ID</strong></TableCell>
                      <TableCell><strong>ФИО</strong></TableCell>
                      <TableCell><strong>Действия</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupStudents.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>{student.id}</TableCell>
                        <TableCell>
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => {
                              // Здесь можно добавить функционал открепления студента от группы
                              enqueueSnackbar('Функционал открепления в разработке', { variant: 'info' });
                            }}
                          >
                            Открепить
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                В этой группе пока нет студентов
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStudentsDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsTab;