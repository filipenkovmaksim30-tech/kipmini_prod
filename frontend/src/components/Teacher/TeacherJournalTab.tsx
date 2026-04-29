import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import { Delete, MoreVert } from '@mui/icons-material';
import { teacherApi } from '../../api/teacher';
import { TeacherJournalResponse, TeacherAssignment } from '../../types/teacher.types';
import { getCurrentAcademicYear } from '../../utils/dateUtils';
import { useSnackbar } from 'notistack';

interface TeacherJournalTabProps {}

const TeacherJournalTab: React.FC<TeacherJournalTabProps> = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<Array<{ id: number; name: string; course: number }>>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | ''>('');
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [allowedSubjects, setAllowedSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [journal, setJournal] = useState<TeacherJournalResponse | null>(null);
  const [filteredLessons, setFilteredLessons] = useState<TeacherJournalResponse['lessons']>([]);
  const [finalGrades, setFinalGrades] = useState<Record<number, Record<number, number>>>({});
  const [loadingFinal, setLoadingFinal] = useState(false);

  // Состояния для диалогов
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    studentId: number;
    lessonId: number;
    gradeId?: number;
    grade: string;
    gradeType: string;
  } | null>(null);

  const [finalDialogOpen, setFinalDialogOpen] = useState(false);
  const [editingFinal, setEditingFinal] = useState<{
    studentId: number;
    subjectId: number;
    gradeId?: number;
    gradeInput: string;
  } | null>(null);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCell, setSelectedCell] = useState<{
    studentId: number;
    lessonId: number;
    grades: any[];
  } | null>(null);

  const currentSemester = teacherApi.getCurrentSemester();

  // Загрузка групп и назначений
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const groupsData = await teacherApi.getMyGroups();
        setGroups(groupsData);
        const profile = await teacherApi.getProfile();
        setTeacherAssignments(profile.assignments || []);
      } catch (err) {
        setError('Ошибка загрузки групп или профиля');
      }
    };
    loadInitial();
  }, []);

  // Формирование списка доступных предметов
  useEffect(() => {
    if (selectedGroup && teacherAssignments.length > 0) {
      const subjects = teacherAssignments
        .filter(ass => ass.group.id === selectedGroup)
        .map(ass => ({
          id: ass.subject.id,
          name: ass.subject.name,
        }));
      const unique = Array.from(new Map(subjects.map(s => [s.id, s])).values());
      setAllowedSubjects(unique);
      if (unique.length > 0) {
        setSelectedSubject(''); // "Все предметы"
      } else {
        setSelectedSubject('');
      }
    } else {
      setAllowedSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedGroup, teacherAssignments]);

  // Загрузка журнала
  const fetchJournal = useCallback(async () => {
    if (!selectedGroup) return;
    try {
      setLoading(true);
      const data = await teacherApi.getGroupJournal(selectedGroup as number, semester, academicYear);
      setJournal(data);
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки журнала: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, semester, academicYear]);

  useEffect(() => {
    if (selectedGroup) {
      fetchJournal();
    }
  }, [fetchJournal]);

  // Загрузка итоговых оценок (если не приходят с сервера)
  useEffect(() => {
    if (!journal || !selectedGroup) return;
    const loadFinalGrades = async () => {
      setLoadingFinal(true);
      const newFinalGrades: Record<number, Record<number, number>> = {};
      for (const student of journal.students) {
        try {
          const grades = await teacherApi.getStudentGrades(student.id);
          const filtered = grades.filter(g => g.semester === semester && g.academic_year === academicYear);
          const subjectGrade: Record<number, number> = {};
          filtered.forEach(g => {
            subjectGrade[g.subject_id] = g.grade;
          });
          newFinalGrades[student.id] = subjectGrade;
        } catch (err) {
          console.error(`Ошибка загрузки оценок для студента ${student.id}`, err);
        }
      }
      setFinalGrades(newFinalGrades);
      setLoadingFinal(false);
    };
    loadFinalGrades();
  }, [journal, semester, academicYear]);

  // Фильтрация занятий по предмету
  useEffect(() => {
    if (journal) {
      let lessons = journal.lessons;
      const allowedIds = allowedSubjects.map(s => s.id);
      lessons = lessons.filter(lesson => allowedIds.includes(lesson.subject_id));
      if (selectedSubject) {
        lessons = lessons.filter(lesson => lesson.subject_id === selectedSubject);
      }
      setFilteredLessons(lessons);
    } else {
      setFilteredLessons([]);
    }
  }, [journal, allowedSubjects, selectedSubject]);

  // Вычисление среднего балла
  const getStudentAverage = (studentId: number): number | null => {
    if (!journal || filteredLessons.length === 0) return null;
    const grades: number[] = [];
    filteredLessons.forEach(lesson => {
      const lessonGrades = journal.grades[lesson.id] || [];
      const studentGrade = lessonGrades.find(g => g.student_id === studentId);
      if (studentGrade) {
        grades.push(studentGrade.grade);
      }
    });
    if (grades.length === 0) return null;
    const sum = grades.reduce((a, b) => a + b, 0);
    return parseFloat((sum / grades.length).toFixed(2));
  };

  // Получение статуса посещаемости
  const getAttendanceStatus = (lessonId: number, studentId: number): string | null => {
    if (!journal?.attendance) return null;
    const attendanceList = journal.attendance[lessonId];
    if (!attendanceList) return null;
    const record = attendanceList.find(a => a.student_id === studentId);
    return record ? record.status : null;
  };

  const getAttendanceLabel = (status: string): string => {
    switch (status) {
      case 'absent': return 'Н';
      case 'absent_excused': return 'Н';
      case 'absent_sick': return 'Н';
      case 'late': return 'ОП';
      default: return '';
    }
  };

  const getAttendanceColor = (status: string): 'error' | 'info' | 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'absent': return 'error';
      case 'absent_excused': return 'info';
      case 'absent_sick': return 'success';
      case 'late': return 'warning';
      default: return 'default';
    }
  };

  const handleCellClick = (event: React.MouseEvent<HTMLElement>, studentId: number, lessonId: number, grades: any[]) => {
    if (grades.length === 0) {
      setEditingCell({ studentId, lessonId, grade: '', gradeType: '' });
      setEditDialogOpen(true);
    } else if (grades.length === 1) {
      setEditingCell({
        studentId,
        lessonId,
        gradeId: grades[0].id,
        grade: grades[0].grade.toString(),
        gradeType: grades[0].grade_type || '',
      });
      setEditDialogOpen(true);
    } else {
      setAnchorEl(event.currentTarget);
      setSelectedCell({ studentId, lessonId, grades });
    }
  };

  const handleSelectGradeForEdit = (grade: any) => {
    setAnchorEl(null);
    setEditingCell({
      studentId: selectedCell!.studentId,
      lessonId: selectedCell!.lessonId,
      gradeId: grade.id,
      grade: grade.grade.toString(),
      gradeType: grade.grade_type || '',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteGrade = async (gradeId: number) => {
    try {
      await teacherApi.deleteLessonGrade(gradeId);
      setJournal(prev => {
        if (!prev) return prev;
        const newGrades = { ...prev.grades };
        Object.keys(newGrades).forEach(key => {
          const lessonId = Number(key);
          newGrades[lessonId] = newGrades[lessonId].filter(g => g.id !== gradeId);
        });
        return { ...prev, grades: newGrades };
      });
      enqueueSnackbar('Оценка удалена', { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка удаления', { variant: 'error' });
    }
  };

  const handleSaveGrade = async () => {
    if (!editingCell) return;
    const gradeNum = parseInt(editingCell.grade);
    if (isNaN(gradeNum) || gradeNum < 2 || gradeNum > 5) {
      enqueueSnackbar('Оценка должна быть числом от 2 до 5', { variant: 'warning' });
      return;
    }
    try {
      if (editingCell.gradeId) {
        const updated = await teacherApi.updateLessonGrade(editingCell.gradeId, {
          grade: gradeNum,
          grade_type: editingCell.gradeType,
        });
        setJournal(prev => {
          if (!prev) return prev;
          const newGrades = { ...prev.grades };
          const lessonGrades = newGrades[editingCell.lessonId] || [];
          const index = lessonGrades.findIndex(g => g.id === editingCell.gradeId);
          if (index !== -1) lessonGrades[index] = updated;
          newGrades[editingCell.lessonId] = lessonGrades;
          return { ...prev, grades: newGrades };
        });
        enqueueSnackbar('Оценка обновлена', { variant: 'success' });
      } else {
        const created = await teacherApi.createLessonGrade({
          student_id: editingCell.studentId,
          schedule_id: editingCell.lessonId,
          grade: gradeNum,
          grade_type: editingCell.gradeType,
        });
        setJournal(prev => {
          if (!prev) return prev;
          const newGrades = { ...prev.grades };
          const lessonGrades = newGrades[editingCell.lessonId] || [];
          newGrades[editingCell.lessonId] = [...lessonGrades, created];
          return { ...prev, grades: newGrades };
        });
        enqueueSnackbar('Оценка добавлена', { variant: 'success' });
      }
      setEditDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка сохранения', { variant: 'error' });
    }
  };

  const handleFinalClick = (studentId: number, subjectId: number) => {
    const currentFinal = finalGrades[studentId]?.[subjectId];
    setEditingFinal({
      studentId,
      subjectId,
      gradeId: undefined,
      gradeInput: currentFinal?.toString() || '',
    });
    setFinalDialogOpen(true);
  };

  const handleSaveFinal = async () => {
    if (!editingFinal) return;
    const gradeNum = parseInt(editingFinal.gradeInput);
    if (isNaN(gradeNum) || gradeNum < 2 || gradeNum > 5) {
      enqueueSnackbar('Оценка должна быть числом от 2 до 5', { variant: 'warning' });
      return;
    }
    try {
      const existing = finalGrades[editingFinal.studentId]?.[editingFinal.subjectId];
      if (existing) {
        // Для простоты создадим новую, предварительно удалив старые (можно доработать)
        await teacherApi.createGrade({
          student_id: editingFinal.studentId,
          subject_id: editingFinal.subjectId,
          grade: gradeNum,
          semester: semester,
          academic_year: academicYear,
        });
      } else {
        await teacherApi.createGrade({
          student_id: editingFinal.studentId,
          subject_id: editingFinal.subjectId,
          grade: gradeNum,
          semester: semester,
          academic_year: academicYear,
        });
      }
      setFinalGrades(prev => ({
        ...prev,
        [editingFinal.studentId]: {
          ...(prev[editingFinal.studentId] || {}),
          [editingFinal.subjectId]: gradeNum,
        },
      }));
      enqueueSnackbar('Итоговая оценка выставлена', { variant: 'success' });
      setFinalDialogOpen(false);
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || 'Ошибка сохранения', { variant: 'error' });
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return 'success';
    if (grade >= 4) return 'info';
    if (grade >= 3) return 'warning';
    return 'error';
  };

  if (!selectedGroup) {
    return (
      <Box>
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Журнал успеваемости</Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Выберите группу</InputLabel>
            <Select value={selectedGroup} label="Выберите группу" onChange={(e) => setSelectedGroup(e.target.value as number)}>
              {groups.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h6">Журнал успеваемости</Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Группа</InputLabel>
            <Select value={selectedGroup} label="Группа" onChange={(e) => setSelectedGroup(e.target.value as number)}>
              {groups.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Предмет</InputLabel>
            <Select value={selectedSubject} label="Предмет" onChange={(e) => setSelectedSubject(e.target.value as number)}>
              <MenuItem value="">Все предметы</MenuItem>
              {allowedSubjects.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Семестр</InputLabel>
            <Select value={semester} label="Семестр" onChange={(e) => setSemester(Number(e.target.value))}>
              <MenuItem value={1}>I семестр</MenuItem>
              <MenuItem value={2}>II семестр</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Учебный год</InputLabel>
            <Select value={academicYear} label="Учебный год" onChange={(e) => setAcademicYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => getCurrentAcademicYear() - 2 + i).map(year => (
                <MenuItem key={year} value={year}>
                  {year}/{year + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" onClick={() => {
            setSemester(currentSemester.semester);
            setAcademicYear(currentSemester.academicYear);
          }}>
            Текущий семестр
          </Button>
          <Button variant="contained" size="small" onClick={fetchJournal}>
            Обновить
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading || loadingFinal ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : filteredLessons.length > 0 ? (
        <TableContainer component={Paper} sx={{ overflowX: 'auto', width: '100%' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Студент</TableCell>
                {filteredLessons.map(lesson => (
                  <TableCell key={lesson.id} align="center" sx={{ minWidth: 80 }}>
                    <Tooltip title={lesson.subject_name}>
                      <span>{lesson.date}</span>
                    </Tooltip>
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ minWidth: 70 }}>Средний</TableCell>
                <TableCell align="center" sx={{ minWidth: 70 }}>Итог</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {journal?.students.map(student => {
                const average = getStudentAverage(student.id);
                return (
                  <TableRow key={student.id}>
                    <TableCell>{student.last_name} {student.first_name}</TableCell>
                    {filteredLessons.map(lesson => {
                      const grades = journal.grades[lesson.id]?.filter(g => g.student_id === student.id) || [];
                      const attendanceStatus = getAttendanceStatus(lesson.id, student.id);
                      return (
                        <TableCell
                          key={lesson.id}
                          align="center"
                          onClick={(e) => handleCellClick(e, student.id, lesson.id, grades)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                        >
                          <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
                            {grades.length > 0 ? (
                              <Box display="flex" flexWrap="wrap" justifyContent="center" gap={0.5}>
                                {grades.map(g => (
                                  <Chip
                                    key={g.id}
                                    label={g.grade}
                                    size="small"
                                    color={getGradeColor(g.grade) as any}
                                    sx={{ fontWeight: 'bold' }}
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                            {attendanceStatus && (
                              <Chip
                                label={getAttendanceLabel(attendanceStatus)}
                                size="small"
                                color={getAttendanceColor(attendanceStatus)}
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                      );
                    })}
                    <TableCell align="center">
                      {average !== null ? (
                        <Chip
                          label={average}
                          size="small"
                          color={average >= 4.5 ? 'success' : average >= 3.5 ? 'warning' : 'error'}
                        />
                      ) : '—'}
                    </TableCell>
                    <TableCell
                      align="center"
                      onClick={() => handleFinalClick(student.id, selectedSubject as number || filteredLessons[0]?.subject_id)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                    >
                      {finalGrades[student.id]?.[selectedSubject as number || filteredLessons[0]?.subject_id] ? (
                        <Chip
                          label={finalGrades[student.id][selectedSubject as number || filteredLessons[0]?.subject_id]}
                          size="small"
                          color={getGradeColor(finalGrades[student.id][selectedSubject as number || filteredLessons[0]?.subject_id]) as any}
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">Нет занятий за выбранный семестр.</Alert>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {selectedCell?.grades.map(grade => (
          <MuiMenuItem key={grade.id} onClick={() => handleSelectGradeForEdit(grade)}>
            Оценка {grade.grade} {grade.grade_type && `(${grade.grade_type})`}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteGrade(grade.id);
                setAnchorEl(null);
              }}
              sx={{ ml: 2 }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </MuiMenuItem>
        ))}
        <MuiMenuItem onClick={() => {
          setAnchorEl(null);
          setEditingCell({
            studentId: selectedCell!.studentId,
            lessonId: selectedCell!.lessonId,
            grade: '',
            gradeType: '',
          });
          setEditDialogOpen(true);
        }}>
          + Добавить новую оценку
        </MuiMenuItem>
      </Menu>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>{editingCell?.gradeId ? 'Редактировать оценку' : 'Новая оценка'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Оценка (2-5)"
            type="number"
            fullWidth
            margin="dense"
            value={editingCell?.grade || ''}
            onChange={(e) => setEditingCell(prev => prev ? { ...prev, grade: e.target.value } : null)}
            inputProps={{ min: 2, max: 5 }}
          />
          <TextField
            label="Тип (необязательно)"
            fullWidth
            margin="dense"
            value={editingCell?.gradeType || ''}
            onChange={(e) => setEditingCell(prev => prev ? { ...prev, gradeType: e.target.value } : null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveGrade} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={finalDialogOpen} onClose={() => setFinalDialogOpen(false)}>
        <DialogTitle>Итоговая семестровая оценка</DialogTitle>
        <DialogContent>
          <TextField
            label="Оценка (2-5)"
            type="number"
            fullWidth
            margin="dense"
            value={editingFinal?.gradeInput || ''}
            onChange={(e) => setEditingFinal(prev => prev ? { ...prev, gradeInput: e.target.value } : null)}
            inputProps={{ min: 2, max: 5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveFinal} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherJournalTab;