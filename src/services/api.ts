import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthUser, RegisterRequest, LoginRequest, User } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5003/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(config: any): Promise<T> {
    try {
      const response = await this.api.request(config);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      throw new Error(errorMessage);
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthUser> {
    const response = await this.request<{success: boolean; data: AuthUser; message?: string}>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    });
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthUser> {
    const response = await this.request<{success: boolean; data: AuthUser; message?: string}>({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>({
      method: 'GET',
      url: '/auth/me',
    });
  }

  // User endpoints
  async getAllUsers(): Promise<User[]> {
    return this.request<User[]>({
      method: 'GET',
      url: '/users',
    });
  }

  async getUserById(id: string): Promise<User> {
    return this.request<User>({
      method: 'GET',
      url: `/users/${id}`,
    });
  }

  async getOnlineUsers(): Promise<User[]> {
    return this.request<User[]>({
      method: 'GET',
      url: '/users/online/list',
    });
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: '/health',
    });
  }

  // Utility methods
  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    // Clean up undefined or invalid token values
    if (token === 'undefined' || token === 'null') {
      localStorage.removeItem('token');
      return null;
    }
    return token;
  }

  removeToken(): void {
    localStorage.removeItem('token');
  }

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined') {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        // Clean up corrupted data
        localStorage.removeItem('user');
        return null;
      }
    }
    // Clean up undefined value
    if (userStr === 'undefined') {
      localStorage.removeItem('user');
    }
    return null;
  }

  removeUser(): void {
    localStorage.removeItem('user');
  }

  clearAuth(): void {
    this.removeToken();
    this.removeUser();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const apiService = new ApiService();