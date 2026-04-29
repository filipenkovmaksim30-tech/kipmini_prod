import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { studentApi } from '../../api/student';
import { StudentJournalResponse, SemesterGrades, StudentJournalLesson, StudentJournalGrade } from '../../types/student.types';
import { getCurrentAcademicYear } from '../../utils/dateUtils';

interface StudentJournalTabProps {
  studentId?: number;
  groupId?: number | null;
}

interface SubjectSummary {
  id: number;
  name: string;
  average: string | null;
  finalGrade: number | null;
}

interface GradeDetail {
  date: string;
  grade: number;
  type: string | null;
}

const StudentJournalTab: React.FC<StudentJournalTabProps> = ({ groupId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);
  const [subjectDetails, setSubjectDetails] = useState<GradeDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const currentSemester = studentApi.getCurrentSemester();

  useEffect(() => {
    if (!groupId) return;
    fetchData();
  }, [semester, academicYear, groupId]);

  const fetchData = async () => {
    if (!groupId) {
      setError('Группа не определена');
      return;
    }
    try {
      setLoading(true);
      // Получаем все занятия и оценки
      const journal = await studentApi.getSemesterJournal(semester, academicYear);
      // Получаем итоговые семестровые оценки
      const finalGrades = await studentApi.getSemesterGrades(semester, academicYear);

      // Группируем занятия по предметам
      const subjectMap = new Map<number, { name: string; grades: number[] }>();
      journal.lessons.forEach(lesson => {
        if (!subjectMap.has(lesson.subject_id)) {
          subjectMap.set(lesson.subject_id, { name: lesson.subject_name, grades: [] });
        }
      });

      // Собираем оценки для каждого предмета
      journal.grades.forEach(grade => {
        const lesson = journal.lessons.find(l => l.id === grade.schedule_id);
        if (lesson) {
          const subject = subjectMap.get(lesson.subject_id);
          if (subject) {
            subject.grades.push(grade.grade);
          }
        }
      });

      // Преобразуем в массив
      const finalMap = new Map<number, number>();
      finalGrades.grades.forEach(g => finalMap.set(g.subject_id, g.grade));

      const subjectsArray: SubjectSummary[] = [];
      subjectMap.forEach((value, subjectId) => {
        const avg = value.grades.length > 0
          ? (value.grades.reduce((a, b) => a + b, 0) / value.grades.length).toFixed(2)
          : null;
        subjectsArray.push({
          id: subjectId,
          name: value.name,
          average: avg,
          finalGrade: finalMap.get(subjectId) || null,
        });
      });

      // Сортируем по алфавиту
      subjectsArray.sort((a, b) => a.name.localeCompare(b.name));
      setSubjects(subjectsArray);
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки данных: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectClick = async (subjectId: number) => {
    if (expandedSubjectId === subjectId) {
      // Если уже раскрыт – закрываем
      setExpandedSubjectId(null);
      setSubjectDetails([]);
    } else {
      // Загружаем детали по предмету
      setExpandedSubjectId(subjectId);
      setLoadingDetails(true);
      try {
        const data = await studentApi.getSubjectGrades(subjectId, semester, academicYear);
        // Преобразуем в удобный формат
        const details = data.lessons.map(lesson => {
          const grade = data.grades.find(g => g.schedule_id === lesson.id);
          return {
            date: lesson.date,
            grade: grade?.grade,
            type: grade?.grade_type || null,
          };
        }).filter(item => item.grade !== undefined); // оставляем только те, где есть оценка
        setSubjectDetails(details);
      } catch (err: any) {
        setError('Ошибка загрузки детализации: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoadingDetails(false);
      }
    }
  };

  if (!groupId) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography>Вы не привязаны к группе. Обратитесь к администратору.</Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 1.5, mb: 1.5, borderRadius: 3 }} className="dashboard-panel">
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h6">Успеваемость</Typography>
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
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : subjects.length > 0 ? (
        <Paper sx={{ p: 1.5, borderRadius: 3 }} className="dashboard-panel">
          <Typography variant="subtitle1" gutterBottom>Предметы</Typography>
          <List>
            {subjects.map(subj => (
              <React.Fragment key={subj.id}>
                <ListItemButton
                  onClick={() => handleSubjectClick(subj.id)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={subj.name}
                    secondary={`Средний балл: ${subj.average ?? '—'}  |  Итоговая: ${subj.finalGrade ?? '—'}`}
                  />
                  {expandedSubjectId === subj.id ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={expandedSubjectId === subj.id} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                    {loadingDetails ? (
                      <CircularProgress size={24} />
                    ) : subjectDetails.length > 0 ? (
                      <TableContainer component={Paper} variant="outlined" className="table-modern">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Дата</TableCell>
                              <TableCell align="center">Оценка</TableCell>
                              <TableCell>Тип</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {subjectDetails.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.date}</TableCell>
                                <TableCell align="center">{item.grade}</TableCell>
                                <TableCell>{item.type || '—'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Нет оценок по этому предмету
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Alert severity="info">Нет данных за выбранный семестр.</Alert>
      )}
    </Box>
  );
};

export default StudentJournalTab;