import axiosInstance from './axiosConfig';
import { User } from './auth';
import {
  Teacher,
  TeacherCreate,
  TeacherUpdate,
  TeacherAssignment,
  TeacherAssignmentCreate,
  TeacherAssignmentResponse,
  TeacherSimple,
} from '../types/teacher.types';

export interface UserWithRole extends User {
  created_at?: string;
}

export interface UsersListResponse {
  users: UserWithRole[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateRoleData {
  role: string;
}

class AdminApi {
  // ---------- Пользователи (существующие методы) ----------
  async getUsers(
    page: number = 1,
    limit: number = 20,
    role?: string,
    search?: string
  ): Promise<UsersListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    if (role && role !== 'all') {
      params.append('role', role);
    }

    if (search) {
      params.append('search', search);
    }

    try {
      const response = await axiosInstance.get(`/admin/users?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Ошибка загрузки пользователей:', error.response?.data || error.message);
      return {
        users: [],
        total: 0,
        page: 1,
        limit: 20
      };
    }
  }

  async getAllUsers(): Promise<UserWithRole[]> {
    try {
      const response = await axiosInstance.get('/admin/users?page=1&limit=1000');
      if (response.data && response.data.users) {
        return response.data.users;
      }
      return [];
    } catch (error: any) {
      console.error('Ошибка загрузки всех пользователей:', error.response?.data || error.message);
      if (error.response?.status === 400) {
        try {
          const fallbackResponse = await axiosInstance.get('/admin/users?page=1&limit=100');
          return fallbackResponse.data?.users || [];
        } catch (fallbackError: any) {
          console.error('Fallback тоже не сработал:', fallbackError.response?.data || fallbackError.message);
          return [];
        }
      }
      return [];
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
    activeUsers: number;
    pendingUsers: number;
  }> {
    try {
      const allUsers = await this.getAllUsers();
      console.log('Получено пользователей для статистики:', allUsers.length);
      console.log('Пользователи:', allUsers);

      const stats = {
        totalUsers: allUsers.length,
        totalStudents: allUsers.filter(u => u.role === 'student').length,
        totalTeachers: allUsers.filter(u => u.role === 'teacher').length,
        totalAdmins: allUsers.filter(u => u.role === 'admin').length,
        activeUsers: allUsers.filter(u => u.is_active).length,
        pendingUsers: allUsers.filter(u => u.role === 'user').length,
      };

      console.log('Статистика:', stats);
      return stats;
    } catch (error: any) {
      console.error('Ошибка загрузки статистики:', error.response?.data || error.message);
      return {
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalAdmins: 0,
        activeUsers: 0,
        pendingUsers: 0,
      };
    }
  }

  async updateUserRole(userId: number, role: string): Promise<User> {
    const response = await axiosInstance.patch(`/admin/users/${userId}/role`, {
      role: role
    });
    return response.data;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // ---------- НОВЫЕ МЕТОДЫ ДЛЯ ПРЕПОДАВАТЕЛЕЙ ----------
  async getAllTeachers(): Promise<Teacher[]> {
    const response = await axiosInstance.get('/teachers/');
    return response.data;
  }

  async createTeacher(data: TeacherCreate): Promise<Teacher> {
    const response = await axiosInstance.post('/teachers/', data);
    return response.data;
  }

  async updateTeacher(teacherId: number, data: TeacherUpdate): Promise<Teacher> {
    const response = await axiosInstance.patch(`/teachers/${teacherId}`, data);
    return response.data;
  }

  async assignTeacherToSubjectGroup(data: TeacherAssignmentCreate): Promise<TeacherAssignmentResponse> {
    const response = await axiosInstance.post('/teacher/assign-subject-group', data);
    return response.data;
  }

  async getTeacherAssignments(teacherId: number): Promise<TeacherAssignment[]> {
    const response = await axiosInstance.get(`/teacher/${teacherId}/assignments`);
    return response.data;
  }

  async getTeachersBySubjectAndGroup(subjectId: number, groupId: number): Promise<TeacherSimple[]> {
    const response = await axiosInstance.get(`/subjects/${subjectId}/groups/${groupId}/teachers`);
    return response.data;
  }
}

export const adminApi = new AdminApi();