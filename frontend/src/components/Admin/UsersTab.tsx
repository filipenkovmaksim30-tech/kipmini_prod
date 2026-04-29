import React, { useState, useEffect } from 'react';
import {
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
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { adminApi, UserWithRole } from '../../api/admin';
import { useSnackbar } from 'notistack'; // Добавляем импорт

const UsersTab: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar(); // Добавляем useSnackbar
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(20);

  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers(page, 20, roleFilter, search);
      console.log("Ответ от Users API:", response);
      setUsers(response.users);
      setTotalUsers(response.total);
      setTotalPages(Math.ceil(response.total / 20));
    } catch (err: any) {
      console.error('Ошибка загрузки пользователей:', err.response?.data || err.message);
      setError('Ошибка загрузки пользователей: ' + (err.response?.data?.detail || err.message));
      enqueueSnackbar('Ошибка загрузки пользователей', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, search]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setDialogOpen(true);
  };

  const updateUserRole = async () => {
    if (!selectedUser) return;

    try {
      await adminApi.updateUserRole(selectedUser.id, newRole);
      setDialogOpen(false);
      enqueueSnackbar('Роль успешно изменена', { variant: 'success' });
      fetchUsers(); // Обновляем список
    } catch (err: any) {
      const errorMsg = 'Ошибка изменения роли: ' + (err.response?.data?.detail || err.message);
      setError(errorMsg);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'teacher': return 'primary';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Фильтры и поиск */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Фильтр по роли</InputLabel>
              <Select
                value={roleFilter}
                label="Фильтр по роли"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">Все роли</MenuItem>
                <MenuItem value="user">Пользователь</MenuItem>
                <MenuItem value="student">Студент</MenuItem>
                <MenuItem value="teacher">Преподаватель</MenuItem>
                <MenuItem value="admin">Администратор</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={5}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Поиск по email или имени..."
                value={search}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: search && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearch('')}>
                        ✕
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Grid>
          <Grid item xs={12} sm={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              disabled={loading}
            >
              Обновить
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Ошибка */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Статистика */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Всего пользователей: {totalUsers}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Chip label={`Пользователи: ${users.filter(u => u.role === 'user').length}`} />
          </Grid>
          <Grid item xs={3}>
            <Chip label={`Студенты: ${users.filter(u => u.role === 'student').length}`} color="success" />
          </Grid>
          <Grid item xs={3}>
            <Chip label={`Преподаватели: ${users.filter(u => u.role === 'teacher').length}`} color="primary" />
          </Grid>
          <Grid item xs={3}>
            <Chip label={`Администраторы: ${users.filter(u => u.role === 'admin').length}`} color="error" />
          </Grid>
        </Grid>
      </Paper>

      {/* Таблица пользователей */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Имя пользователя</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Дата регистрации</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.is_active ? 'Активен' : 'Неактивен'}
                    color={user.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(user.created_at)}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleRoleChange(user)}
                  >
                    Изменить роль
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Пагинация */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* Диалог изменения роли */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Изменение роли пользователя</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Пользователь:</strong> {selectedUser.username}</Typography>
              <Typography><strong>Email:</strong> {selectedUser.email}</Typography>
              <Typography><strong>Текущая роль:</strong> {selectedUser.role}</Typography>

              <FormControl fullWidth sx={{ mt: 3 }}>
                <InputLabel>Новая роль</InputLabel>
                <Select
                  value={newRole}
                  label="Новая роль"
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <MenuItem value="user">Пользователь</MenuItem>
                  <MenuItem value="student">Студент</MenuItem>
                  <MenuItem value="teacher">Преподаватель</MenuItem>
                  <MenuItem value="admin">Администратор</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={updateUserRole}
            variant="contained"
            disabled={!newRole || newRole === selectedUser?.role}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersTab;