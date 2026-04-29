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
import { Edit, Delete, Add, Search, Book, Code } from '@mui/icons-material';
import axiosInstance from '../../api/axiosConfig';
import { useSnackbar } from 'notistack';

interface Subject {
  id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

const SubjectsTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/subjects/');
      setSubjects(response.data);
    } catch (err: any) {
      setError('Ошибка загрузки предметов: ' + (err.response?.data?.detail || err.message));
      enqueueSnackbar('Ошибка загрузки предметов', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (subject: Subject | null = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
      });
    } else {
      setEditingSubject(null);
      setFormData({
        name: '',
        code: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSubject(null);
  };

  const handleSubmit = async () => {
    try {
      const dataToSend = {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
      };

      if (editingSubject) {
        // Обновление
        await axiosInstance.patch(`/subjects/${editingSubject.id}`, dataToSend);
        enqueueSnackbar('Предмет успешно обновлен', { variant: 'success' });
      } else {
        // Создание
        await axiosInstance.post('/subjects/', dataToSend);
        enqueueSnackbar('Предмет успешно создан', { variant: 'success' });
      }
      fetchSubjects();
      handleCloseDialog();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Ошибка сохранения предмета';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleDelete = async (subjectId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот предмет? Все связанные оценки будут удалены.')) {
      try {
        await axiosInstance.delete(`/subjects/${subjectId}`);
        enqueueSnackbar('Предмет успешно удален', { variant: 'success' });
        fetchSubjects();
      } catch (err: any) {
        const errorMsg = err.response?.data?.detail || 'Ошибка удаления предмета';
        enqueueSnackbar(errorMsg, { variant: 'error' });
      }
    }
  };

  // Фильтрация предметов
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.description && subject.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && subjects.length === 0) {
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
          <Typography variant="h5">Управление предметами</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            Добавить предмет
          </Button>
        </Box>

        {/* Поиск */}
        <TextField
          placeholder="Поиск по названию, коду или описанию..."
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

      {/* Статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Book sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="primary">
                    {subjects.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего предметов
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
                <Code sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="secondary">
                    {new Set(subjects.map(s => s.code.split('-')[0])).size}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Уникальных кодов
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
                    {subjects.filter(s => s.description && s.description.length > 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    С описанием
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
                <Code sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {new Date().getFullYear()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Текущий учебный год
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Таблица предметов */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Название предмета</strong></TableCell>
              <TableCell><strong>Код предмета</strong></TableCell>
              <TableCell><strong>Описание</strong></TableCell>
              <TableCell><strong>Дата создания</strong></TableCell>
              <TableCell><strong>Действия</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject) => (
                <TableRow key={subject.id} hover>
                  <TableCell>{subject.id}</TableCell>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {subject.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={subject.code}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                      {subject.description || 'Нет описания'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(subject.created_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleOpenDialog(subject)}
                      color="primary"
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(subject.id)}
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
                    {searchTerm ? 'Предметы не найдены' : 'Предметов пока нет'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог создания/редактирования предмета */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingSubject ? 'Редактировать предмет' : 'Добавить новый предмет'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              margin="dense"
              label="Название предмета"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              sx={{ mb: 2 }}
              helperText="Полное название предмета (например, 'Математический анализ')"
            />
            <TextField
              margin="dense"
              label="Код предмета"
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              required
              sx={{ mb: 2 }}
              helperText="Уникальный код предмета (например, 'MATH-101')"
            />
            <TextField
              margin="dense"
              label="Описание"
              fullWidth
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              helperText="Краткое описание предмета (опционально)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name || !formData.code}
          >
            {editingSubject ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubjectsTab;