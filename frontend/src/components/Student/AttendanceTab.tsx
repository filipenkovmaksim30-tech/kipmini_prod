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
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import { studentApi } from '../../api/student';
import { StudentAttendanceSummary } from '../../types/attendance.types';
import { getCurrentAcademicYear } from '../../utils/dateUtils';

const AttendanceTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [summary, setSummary] = useState<StudentAttendanceSummary[]>([]);

  const currentSemester = studentApi.getCurrentSemester();

  useEffect(() => {
    fetchSummary();
  }, [semester, academicYear]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getMyAttendanceSummary(semester, academicYear);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError('Ошибка загрузки статистики: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h6">Посещаемость</Typography>
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
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Предмет</TableCell>
                <TableCell align="center">Всего пропусков</TableCell>
                <TableCell align="center">Прогулы</TableCell>
                <TableCell align="center">Уважительные</TableCell>
                <TableCell align="center">Болезни</TableCell>
                <TableCell align="center">Опоздания</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.length > 0 ? (
                summary.map(item => (
                  <TableRow key={item.subject_id}>
                    <TableCell>{item.subject_name}</TableCell>
                    <TableCell align="center">{item.total_absences}</TableCell>
                    <TableCell align="center">
                      <Chip label={item.absent_count} size="small" color="error" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.absent_excused_count} size="small" color="info" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.absent_sick_count} size="small" color="success" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.late_count} size="small" color="warning" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Нет данных за выбранный семестр</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AttendanceTab;