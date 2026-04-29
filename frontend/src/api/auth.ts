import axiosInstance from './axiosConfig';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  role: string;
  avatar?: string; // добавлено
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthApi {
  async register(data: RegisterData): Promise<User> {
    const response = await axiosInstance.post('/auth/register', {
      email: data.email,
      username: data.username,
      password: data.password,
    });
    return response.data;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('password', data.password);

    const response = await axiosInstance.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    const response = await axiosInstance.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  async changeEmail(newEmail: string): Promise<User> {
    const response = await axiosInstance.post('/auth/change-email', { new_email: newEmail });
    return response.data;
  }

  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/auth/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  updateCurrentUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export const authApi = new AuthApi();