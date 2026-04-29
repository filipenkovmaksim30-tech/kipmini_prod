import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { studentApi } from '../../api/student';
import { Grade, SemesterGrades } from '../../types/student.types';

interface GradesTabProps {
  studentId?: number;
}

const GradesTab: React.FC<GradesTabProps> = ({ studentId }) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [semesterGrades, setSemesterGrades] = useState<SemesterGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'semester'>('all');
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear() - 1);
  // Выбранный предмет для детального просмотра
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
  const [subjectLessons, setSubjectLessons] = useState<Array<{ id: number; date: string; subject_name: string }>>([]);
  const [subjectGrades, setSubjectGrades] = useState<Array<{ schedule_id: number; grade: number; grade_type: string | null }>>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchGrades();
    // Сброс детального просмотра при смене режима или периода
    setSelectedSubjectId(null);
    setSubjectLessons([]);
    setSubjectGrades([]);
  }, [viewMode, semester, academicYear]);

  const fetchGrades = async () => {
    try {
      setLoading(true);
      setError(null);

      if (viewMode === 'all') {
        const data = await studentApi.getGrades();
        setGrades(data);
      } else {
        const data = await studentApi.getSemesterGrades(semester, academicYear);
        setSemesterGrades(data);
      }
    } catch (err: any) {
      setError('Ошибка загрузки оценок: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number) => {
    switch (grade) {
      case 5: return 'grade-5';
      case 4: return 'grade-4';
      case 3: return 'grade-3';
      case 2: return 'grade-2';
      default: return '';
    }
  };

  const currentSemester = studentApi.getCurrentSemester();

  // Загрузка детальной информации по предмету (уроки и оценки)
  const loadSubjectDetails = async (subjectId: number, subjectName: string) => {
    try {
      setLoadingDetails(true);
      setSelectedSubjectId(subjectId);
      setSelectedSubjectName(subjectName);
      const data = await studentApi.getSubjectGrades(subjectId, semester, academicYear);
      // lessons: [{id,date,subject_name}], grades: [{schedule_id, grade, grade_type}]
      setSubjectLessons(data.lessons.map(l => ({ id: l.id, date: l.date, subject_name: l.subject_name })));
      setSubjectGrades(data.grades.map(g => ({ schedule_id: g.schedule_id, grade: g.grade, grade_type: g.grade_type })));
    } catch (err: any) {
      setError('Ошибка загрузки детализации: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Фильтры и переключение */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Typography variant="h6">Оценки</Typography>
            </Grid>
            <Grid item>
              <Chip
                label="Все оценки"
                color={viewMode === 'all' ? 'primary' : 'default'}
                onClick={() => setViewMode('all')}
                sx={{ mr: 1 }}
              />
              <Chip
                label="За семестр"
                color={viewMode === 'semester' ? 'primary' : 'default'}
                onClick={() => setViewMode('semester')}
              />
            </Grid>

            {viewMode === 'semester' && (
              <>
                <Grid item>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Семестр</InputLabel>
                    <Select
                      value={semester}
                      label="Семестр"
                      onChange={(e) => setSemester(Number(e.target.value))}
                    >
                      <MenuItem value={1}>1 семестр</MenuItem>
                      <MenuItem value={2}>2 семестр</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Учебный год</InputLabel>
                    <Select
                      value={academicYear}
                      label="Учебный год"
                      onChange={(e) => setAcademicYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                        <MenuItem key={year} value={year}>
                          {year}/{year + 1}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <Chip
                    label="Текущий семестр"
                    color="secondary"
                    onClick={() => {
                      setSemester(currentSemester.semester);
                      setAcademicYear(currentSemester.academicYear);
                    }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      </Grid>

      {/* Ошибка */}
      {error && (
        <Grid item xs={12}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        </Grid>
      )}

      {/* Динамическая шапка дат для выбранного предмета */}
      {viewMode === 'semester' && selectedSubjectId && (
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 1.5, mb: 1.5, borderRadius: 3 }} className="dashboard-panel">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              {selectedSubjectName}: даты оценок
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {subjectLessons.map(l => (
                <Chip key={l.id} label={l.date} size="small" variant="outlined" />
              ))}
              {subjectLessons.length === 0 && (
                <Typography variant="body2" color="text.secondary">Нет дат для выбранного предмета</Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      )}

      {/* Таблица оценок */}
      <Grid item xs={12}>
        <TableContainer component={Paper} className="grades-table table-modern">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Предмет</TableCell>
                <TableCell align="center">Код предмета</TableCell>
                <TableCell align="center">Оценка</TableCell>
                {viewMode === 'all' ? (
                  <>
                    <TableCell align="center">Семестр</TableCell>
                    <TableCell align="center">Учебный год</TableCell>
                    <TableCell align="center">Дата</TableCell>
                  </>
                ) : (
                  <TableCell align="center">Дата выставления</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {viewMode === 'all' ? (
                grades.length > 0 ? (
                  grades.map((grade) => (
                    <TableRow key={grade.id} hover>
                      <TableCell>{grade.subject_name}</TableCell>
                      <TableCell align="center">{grade.subject_code}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={grade.grade}
                          className={`grade-chip ${getGradeColor(grade.grade)}`}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">{grade.semester}</TableCell>
                      <TableCell align="center">{grade.academic_year}/{grade.academic_year + 1}</TableCell>
                      <TableCell align="center">
                        {new Date(grade.date_assigned).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" py={3}>
                        Оценок пока нет
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              ) : semesterGrades ? (
                semesterGrades.grades.length > 0 ? (
                  semesterGrades.grades.map((grade) => (
                    <TableRow
                      key={grade.id}
                      hover
                      onClick={() => loadSubjectDetails(grade.subject_id, grade.subject_name)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{grade.subject_name}</Typography>
                          {selectedSubjectId === grade.subject_id && (
                            <Chip size="small" color="primary" label="Выбрано" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{grade.subject_code}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={grade.grade}
                          className={`grade-chip ${getGradeColor(grade.grade)}`}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {new Date(grade.date_assigned).toLocaleDateString('ru-RU')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" py={3}>
                        Оценок за выбранный семестр нет
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>

      {/* Пояснения по выбранному предмету */}
      {viewMode === 'semester' && selectedSubjectId && (
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3 }} className="dashboard-panel">
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Пояснения по предмету: {selectedSubjectName}
            </Typography>
            {loadingDetails ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : subjectLessons.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8 }}>
                <Typography variant="caption" color="text.secondary">Дата</Typography>
                <Typography variant="caption" color="text.secondary">Тип оценки</Typography>
                <Typography variant="caption" color="text.secondary">Оценка</Typography>
                {subjectLessons.map(lesson => {
                  const g = subjectGrades.find(x => x.schedule_id === lesson.id);
                  return (
                    <React.Fragment key={lesson.id}>
                      <Typography>{lesson.date}</Typography>
                      <Typography>{g?.grade_type ?? '—'}</Typography>
                      <Box>
                        {g ? (
                          <Chip
                            label={g.grade}
                            className={`grade-chip ${getGradeColor(g.grade)}`}
                            size="small"
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">—</Typography>
                        )}
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Нет детализации для выбранного предмета
              </Typography>
            )}
          </Paper>
        </Grid>
      )}

      {/* Статистика */}
      {grades.length > 0 && viewMode === 'all' && (
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Статистика</Typography>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Paper className="stats-card">
                  <Typography className="stats-value" color="primary">
                    {grades.length}
                  </Typography>
                  <Typography className="stats-label">Всего оценок</Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper className="stats-card">
                  <Typography className="stats-value" color="success.main">
                    {grades.filter(g => g.grade === 5).length}
                  </Typography>
                  <Typography className="stats-label">Отлично (5)</Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper className="stats-card">
                  <Typography className="stats-value" color="info.main">
                    {grades.filter(g => g.grade === 4).length}
                  </Typography>
                  <Typography className="stats-label">Хорошо (4)</Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper className="stats-card">
                  <Typography className="stats-value" color="warning.main">
                    {grades.filter(g => g.grade === 3).length}
                  </Typography>
                  <Typography className="stats-label">Удовлетворительно (3)</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default GradesTab;