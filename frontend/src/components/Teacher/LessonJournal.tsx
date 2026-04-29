import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { teacherApi } from '../../api/teacher';
import { LessonGrade} from '../../types/teacher.types';
import {AttendanceStatus } from '../../types/attendance.types';
import { useSnackbar } from 'notistack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  group_id: number | null;
}

interface EditingGrade {
  gradeId: number;
  grade: number;
  gradeType: string;
}

const LessonJournal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryParams = new URLSearchParams(location.search);
  
  const groupId = queryParams.get('group_id');
  const groupName = queryParams.get('group_name');
  const subjectId = queryParams.get('subject_id');
  const subjectName = queryParams.get('subject_name');
  const scheduleId = queryParams.get('schedule_id');
  const date = queryParams.get('date');

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<number, LessonGrade[]>>({});
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [originalAttendance, setOriginalAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [newGrades, setNewGrades] = useState<Record<number, { grade: string; gradeType: string }>>({});
  const [editingGrade, setEditingGrade] = useState<EditingGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => {
    if (!groupId || !scheduleId) {
      setError('Недостаточно данных для загрузки журнала');
      return;
    }
    fetchStudents();
    fetchGrades();
    fetchAttendance();
  }, [groupId, scheduleId]);

  const fetchStudents = async () => {
    try {
      const response = await teacherApi.getMyStudents();
      const filtered = response.filter(s => s.group_id !== null && s.group_id === Number(groupId));
      filtered.sort((a, b) => {
        if (a.last_name !== b.last_name) return a.last_name.localeCompare(b.last_name);
        return a.first_name.localeCompare(b.first_name);
      });
      setStudents(filtered);
    } catch (err) {
      enqueueSnackbar('Ошибка загрузки списка студентов', { variant: 'error' });
    }
  };

  const fetchGrades = async () => {
    if (!scheduleId) return;
    try {
      setLoading(true);
      const data = await teacherApi.getLessonGradesBySchedule(Number(scheduleId));
      const gradesMap: Record<number, LessonGrade[]> = {};
      data.forEach(g => {
        if (!gradesMap[g.student_id]) gradesMap[g.student_id] = [];
        gradesMap[g.student_id].push(g);
      });
      setGrades(gradesMap);
    } catch (err) {
      enqueueSnackbar('Ошибка загрузки оценок', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!scheduleId) return;
    try {
      const data = await teacherApi.getAttendanceForSchedule(Number(scheduleId));
      setAttendance(data);
      setOriginalAttendance(data);
    } catch (err) {
      console.error('Ошибка загрузки посещаемости', err);
    }
  };

  const handleAttendanceChange = (studentId: number, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    const changes: Record<number, AttendanceStatus> = {};
    for (const [studentId, status] of Object.entries(attendance)) {
      if (originalAttendance[Number(studentId)] !== status) {
        changes[Number(studentId)] = status;
      }
    }
    if (Object.keys(changes).length === 0) {
      enqueueSnackbar('Нет изменений для сохранения', { variant: 'info' });
      return;
    }
    setSavingAttendance(true);
    try {
      await teacherApi.updateAttendanceBulk(Number(scheduleId), changes);
      setOriginalAttendance({ ...attendance });
      enqueueSnackbar('Посещаемость сохранена', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка сохранения посещаемости', { variant: 'error' });
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleNewGradeChange = (studentId: number, field: 'grade' | 'gradeType', value: string) => {
    setNewGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const handleAddGrade = async (studentId: number) => {
    const newGrade = newGrades[studentId];
    if (!newGrade || !newGrade.grade) {
      enqueueSnackbar('Введите оценку', { variant: 'warning' });
      return;
    }
    const gradeNum = parseInt(newGrade.grade);
    if (isNaN(gradeNum) || gradeNum < 2 || gradeNum > 5) {
      enqueueSnackbar('Оценка должна быть числом от 2 до 5', { variant: 'warning' });
      return;
    }
    try {
      const created = await teacherApi.createLessonGrade({
        student_id: studentId,
        schedule_id: Number(scheduleId),
        grade: gradeNum,
        grade_type: newGrade.gradeType || null,
      });
      setGrades(prev => ({
        ...prev,
        [studentId]: [...(prev[studentId] || []), created],
      }));
      setNewGrades(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });
      enqueueSnackbar('Оценка добавлена', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка добавления', { variant: 'error' });
    }
  };

  const handleDeleteGrade = async (gradeId: number) => {
    try {
      await teacherApi.deleteLessonGrade(gradeId);
      setGrades(prev => {
        const newGrades = { ...prev };
        Object.keys(newGrades).forEach(studentId => {
          newGrades[Number(studentId)] = newGrades[Number(studentId)].filter(g => g.id !== gradeId);
          if (newGrades[Number(studentId)].length === 0) delete newGrades[Number(studentId)];
        });
        return newGrades;
      });
      enqueueSnackbar('Оценка удалена', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка удаления', { variant: 'error' });
    }
  };

  const handleEditGrade = (grade: LessonGrade) => {
    setEditingGrade({
      gradeId: grade.id,
      grade: grade.grade,
      gradeType: grade.grade_type || '',
    });
  };

  const handleUpdateGrade = async () => {
    if (!editingGrade) return;
    const { gradeId, grade, gradeType } = editingGrade;
    if (grade < 2 || grade > 5) {
      enqueueSnackbar('Оценка должна быть от 2 до 5', { variant: 'warning' });
      return;
    }
    try {
      const updated = await teacherApi.updateLessonGrade(gradeId, {
        grade,
        grade_type: gradeType || null,
      });
      setGrades(prev => {
        const newGrades = { ...prev };
        Object.keys(newGrades).forEach(studentId => {
          const studentGrades = newGrades[Number(studentId)];
          const index = studentGrades.findIndex(g => g.id === gradeId);
          if (index !== -1) studentGrades[index] = updated;
        });
        return newGrades;
      });
      setEditingGrade(null);
      enqueueSnackbar('Оценка обновлена', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка обновления', { variant: 'error' });
    }
  };

  const handleCancelEdit = () => setEditingGrade(null);
  const handleGoBack = () => navigate(-1);

  if (!groupId || !scheduleId) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">Не указаны параметры группы или занятия</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={handleGoBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">Журнал занятий</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Chip label={`Дата: ${date || 'не указана'}`} color="primary" />
          <Chip label={`Предмет: ${subjectName || 'не указан'}`} color="secondary" />
          <Chip label={`Группа: ${groupName || 'не указана'}`} color="info" />
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>№</TableCell>
                  <TableCell>Студент</TableCell>
                  <TableCell>Оценки</TableCell>
                  <TableCell>Новая оценка</TableCell>
                  <TableCell>Посещаемость</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student, index) => {
                  const studentGrades = grades[student.id] || [];
                  const newGrade = newGrades[student.id];
                  const attendanceStatus = attendance[student.id];
                  return (
                    <TableRow key={student.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.last_name} {student.first_name}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {studentGrades.map(grade => (
                            <Box
                              key={grade.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: '#f5f5f5',
                                borderRadius: 1,
                                p: 0.5,
                                mb: 1,
                              }}
                            >
                              {editingGrade?.gradeId === grade.id ? (
                                <>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={editingGrade.grade}
                                    onChange={e => setEditingGrade({ ...editingGrade, grade: parseInt(e.target.value) || 0 })}
                                    inputProps={{ min: 2, max: 5 }}
                                    sx={{ width: 70, mr: 1 }}
                                  />
                                  <TextField
                                    size="small"
                                    value={editingGrade.gradeType}
                                    onChange={e => setEditingGrade({ ...editingGrade, gradeType: e.target.value })}
                                    placeholder="Тип"
                                    sx={{ width: 120, mr: 1 }}
                                  />
                                  <IconButton size="small" color="primary" onClick={handleUpdateGrade}>
                                    <SaveIcon />
                                  </IconButton>
                                  <IconButton size="small" onClick={handleCancelEdit}>
                                    <DeleteIcon />
                                  </IconButton>
                                </>
                              ) : (
                                <>
                                  <Chip
                                    label={grade.grade_type ? `${grade.grade} (${grade.grade_type})` : `${grade.grade}`}
                                    size="small"
                                    color={grade.grade >= 4 ? 'success' : grade.grade === 3 ? 'warning' : 'error'}
                                    sx={{ mr: 0.5 }}
                                  />
                                  <IconButton size="small" onClick={() => handleEditGrade(grade)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDeleteGrade(grade.id)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            size="small"
                            placeholder="Тип (необяз.)"
                            value={newGrade?.gradeType || ''}
                            onChange={e => handleNewGradeChange(student.id, 'gradeType', e.target.value)}
                            sx={{ width: 120 }}
                          />
                          <TextField
                            size="small"
                            type="number"
                            placeholder="Оценка*"
                            value={newGrade?.grade || ''}
                            onChange={e => handleNewGradeChange(student.id, 'grade', e.target.value)}
                            inputProps={{ min: 2, max: 5 }}
                            sx={{ width: 80 }}
                          />
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddGrade(student.id)}
                          >
                            Добавить
                          </Button>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel>Статус</InputLabel>
                          <Select
                            value={attendanceStatus || ''}
                            label="Статус"
                            onChange={(e) => handleAttendanceChange(student.id, e.target.value as AttendanceStatus)}
                          >
                            <MenuItem value="">Присутствовал</MenuItem>
                            <MenuItem value="absent">Н (прогул)</MenuItem>
                            <MenuItem value="absent_excused">Н (уваж.)</MenuItem>
                            <MenuItem value="absent_sick">Н (болезнь)</MenuItem>
                            <MenuItem value="late">ОП</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSaveAttendance}
              disabled={savingAttendance}
            >
              {savingAttendance ? 'Сохранение...' : 'Сохранить посещаемость'}
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
};

export default LessonJournal;