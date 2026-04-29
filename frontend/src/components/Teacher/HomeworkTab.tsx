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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Edit, Delete, Add, AttachFile } from '@mui/icons-material';
import { teacherApi } from '../../api/teacher';
import { Homework } from '../../types/homework.types';
import { ScheduleItem } from '../../types/teacher.types';
import { useSnackbar } from 'notistack';
import { getWeekStart, getCurrentAcademicYear } from '../../utils/dateUtils';
import axiosInstance from '../../api/axiosConfig';
import { getFileIcon } from '../../utils/fileIcons';

interface Group {
  id: number;
  name: string;
  course: number;
}

interface HomeworkFile {
  id: number;
  filename: string;
  size?: number;
  created_at: string;
}

const HomeworkTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | ''>('');
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [filesMap, setFilesMap] = useState<Record<number, HomeworkFile[]>>({});

  // Для создания/редактирования
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [editText, setEditText] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | ''>('');
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Для файлов
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [currentHomeworkId, setCurrentHomeworkId] = useState<number | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchHomeworks();
    } else {
      setHomeworks([]);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const groupsData = await teacherApi.getMyGroups();
      setGroups(groupsData);
    } catch (err) {
      enqueueSnackbar('Ошибка загрузки групп', { variant: 'error' });
    }
  };

  const fetchHomeworks = async () => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const data = await teacherApi.getHomeworksForGroup(selectedGroup as number);
      setHomeworks(data);
      const files: Record<number, HomeworkFile[]> = {};
      await Promise.all(
        data.map(async (hw) => {
          try {
            const hwFiles = await teacherApi.getHomeworkFiles(hw.id);
            files[hw.id] = hwFiles;
          } catch (err) {
            console.error(`Ошибка загрузки файлов для ДЗ ${hw.id}`, err);
          }
        })
      );
      setFilesMap(files);
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки домашних заданий');
      enqueueSnackbar('Ошибка загрузки', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (groupId: number) => {
    setLoadingSchedules(true);
    try {
      const academicYear = getCurrentAcademicYear();
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 14);
      const weeksToLoad = 7;
      const allSchedules: ScheduleItem[] = [];

      for (let i = 0; i < weeksToLoad; i++) {
        const weekStart = getWeekStart(startDate);
        const weeklyData = await teacherApi.getWeeklySchedule(academicYear, weekStart);
        Object.values(weeklyData).forEach((dayLessons: any) => {
          dayLessons.forEach((lesson: ScheduleItem) => {
            if (lesson.group_id === groupId) {
              allSchedules.push(lesson);
            }
          });
        });
        startDate.setDate(startDate.getDate() + 7);
      }

      const options = allSchedules.map(lesson => ({
        id: lesson.id,
        label: `${lesson.formatted_date} ${lesson.start_time}-${lesson.end_time} - ${lesson.subject_name}`,
      }));
      options.sort((a, b) => {
        const [dA, mA] = a.label.split(' ')[0].split('.').map(Number);
        const [dB, mB] = b.label.split(' ')[0].split('.').map(Number);
        if (mA !== mB) return mA - mB;
        return dA - dB;
      });
      setAvailableSchedules(options.map(o => ({ ...o, subject_name: o.label.split(' - ')[1] } as ScheduleItem)));
    } catch (error) {
      enqueueSnackbar('Не удалось загрузить список занятий', { variant: 'error' });
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleOpenCreateDialog = () => {
    if (!selectedGroup) return;
    setEditingHomework(null);
    setEditText('');
    setEditTopic('');
    setSelectedScheduleId('');
    setSelectedFiles([]);
    fetchSchedules(selectedGroup as number);
    setEditDialogOpen(true);
  };

  const handleOpenEditDialog = (hw: Homework) => {
    setEditingHomework(hw);
    setEditText(hw.text);
    setEditTopic(hw.topic || '');
    setSelectedScheduleId(hw.schedule_id);
    setSelectedFiles([]);
    fetchSchedules(selectedGroup as number);
    setEditDialogOpen(true);
  };

  const handleSaveHomework = async () => {
    if (!selectedScheduleId || !editText.trim()) {
      enqueueSnackbar('Выберите занятие и введите текст задания', { variant: 'warning' });
      return;
    }
    try {
      let homeworkId: number;
      if (editingHomework) {
        const updated = await teacherApi.updateHomework(editingHomework.id, {
          text: editText,
          topic: editTopic.trim() || undefined,
        });
        homeworkId = updated.id;
        enqueueSnackbar('Домашнее задание обновлено', { variant: 'success' });
      } else {
        const created = await teacherApi.createHomework({
          schedule_id: Number(selectedScheduleId),
          text: editText,
          topic: editTopic.trim() || undefined,
        });
        homeworkId = created.id;
        enqueueSnackbar('Домашнее задание создано', { variant: 'success' });
      }
      // Загружаем файлы, если есть
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          try {
            await teacherApi.uploadHomeworkFile(homeworkId, file);
          } catch (err) {
            enqueueSnackbar(`Ошибка загрузки файла ${file.name}`, { variant: 'error' });
          }
        }
        setUploadingFiles(false);
      }
      setEditDialogOpen(false);
      fetchHomeworks(); // перезагрузить список
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка сохранения', { variant: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить это домашнее задание?')) return;
    try {
      await teacherApi.deleteHomework(id);
      setHomeworks(prev => prev.filter(h => h.id !== id));
      enqueueSnackbar('Домашнее задание удалено', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Ошибка удаления', { variant: 'error' });
    }
  };

  const handleDeleteFile = async (fileId: number, homeworkId: number) => {
    try {
      await teacherApi.deleteHomeworkFile(fileId);
      setFilesMap(prev => ({
        ...prev,
        [homeworkId]: prev[homeworkId].filter(f => f.id !== fileId),
      }));
      enqueueSnackbar('Файл удалён', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка удаления', { variant: 'error' });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Домашние задания
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Выберите группу</InputLabel>
            <Select
              value={selectedGroup}
              label="Выберите группу"
              onChange={(e) => setSelectedGroup(e.target.value as number)}
            >
              {groups.map(group => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name} (курс {group.course})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreateDialog}
            disabled={!selectedGroup}
          >
            Создать задание
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Предмет</TableCell>
                <TableCell>Тема</TableCell>
                <TableCell>Домашнее задание</TableCell>
                <TableCell>Файлы</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {homeworks.length > 0 ? (
                homeworks.map(hw => (
                  <TableRow key={hw.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {hw.formatted_date || '??'} (нед. {hw.week_num})
                      </Typography>
                    </TableCell>
                    <TableCell>{hw.subject_name || 'Предмет не указан'}</TableCell>
                    <TableCell>{hw.topic || '—'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'pre-wrap', maxWidth: 400 }}>
                      {hw.text}
                    </TableCell>
                    <TableCell>
                      {filesMap[hw.id]?.map(file => {
                        const FileIcon = getFileIcon(file.filename);
                        return (
                          <Box key={file.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Button
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
                            >
                              {file.filename}
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteFile(file.id, hw.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleOpenEditDialog(hw)} color="primary" size="small">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(hw.id)} color="error" size="small">
                        <Delete />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setCurrentHomeworkId(hw.id);
                          setFileDialogOpen(true);
                        }}
                        color="default"
                        size="small"
                      >
                        <AttachFile />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {selectedGroup ? 'Нет домашних заданий для этой группы' : 'Выберите группу'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог создания/редактирования ДЗ */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingHomework ? 'Редактировать домашнее задание' : 'Создать домашнее задание'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Занятие *</InputLabel>
              <Select
                value={selectedScheduleId}
                label="Занятие *"
                onChange={(e) => setSelectedScheduleId(e.target.value as number)}
                disabled={loadingSchedules}
              >
                {loadingSchedules ? (
                  <MenuItem value="">Загрузка...</MenuItem>
                ) : availableSchedules.length === 0 ? (
                  <MenuItem value="">Нет доступных занятий</MenuItem>
                ) : (
                  availableSchedules.map(option => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.formatted_date} {option.start_time}-{option.end_time} - {option.subject_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              label="Тема занятия (необязательно)"
              fullWidth
              size="small"
              value={editTopic}
              onChange={(e) => setEditTopic(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Текст задания"
              fullWidth
              multiline
              rows={6}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle2" gutterBottom>
              Файлы (макс. 5, до 10 МБ каждый, разрешены: .pdf, .doc, .docx, .jpg, .png, .pptx, .xlsx)
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Button variant="outlined" component="label" startIcon={<AttachFile />}>
                Выбрать файлы
                <input type="file" multiple hidden onChange={handleFileSelect} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedFiles.length} файлов выбрано
              </Typography>
            </Box>
            {selectedFiles.length > 0 && (
              <List dense>
                {selectedFiles.map((file, idx) => (
                  <ListItem key={idx} sx={{ py: 0 }}>
                    <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(0)} КБ`} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => removeSelectedFile(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveHomework} variant="contained" disabled={uploadingFiles}>
            {uploadingFiles ? <CircularProgress size={24} /> : (editingHomework ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог добавления файлов к существующему ДЗ */}
      <Dialog open={fileDialogOpen} onClose={() => setFileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить файлы к домашнему заданию</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Button variant="outlined" component="label" startIcon={<AttachFile />} fullWidth>
              Выбрать файлы
              <input type="file" multiple hidden onChange={handleFileSelect} />
            </Button>
            {selectedFiles.length > 0 && (
              <List dense sx={{ mt: 2 }}>
                {selectedFiles.map((file, idx) => (
                  <ListItem key={idx} sx={{ py: 0 }}>
                    <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(0)} КБ`} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" size="small" onClick={() => removeSelectedFile(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFileDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={async () => {
              if (!currentHomeworkId || selectedFiles.length === 0) return;
              setUploadingFiles(true);
              for (const file of selectedFiles) {
                try {
                  await teacherApi.uploadHomeworkFile(currentHomeworkId, file);
                } catch (err) {
                  enqueueSnackbar(`Ошибка загрузки файла ${file.name}`, { variant: 'error' });
                }
              }
              setUploadingFiles(false);
              setFileDialogOpen(false);
              setSelectedFiles([]);
              fetchHomeworks();
            }}
            variant="contained"
            disabled={uploadingFiles || selectedFiles.length === 0}
          >
            {uploadingFiles ? <CircularProgress size={24} /> : 'Загрузить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HomeworkTab;