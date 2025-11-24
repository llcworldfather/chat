import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthUser, RegisterRequest, LoginRequest, User } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

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

        this.api.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.api.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error) => {
                if (error.response?.status === 401) {
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
        const response = await this.request<any>({
            method: 'GET',
            url: '/auth/me',
        });
        // [修复] 兼容处理：如果返回的数据包含 data 字段，则使用 data 字段
        return response.data || response;
    }

    async getAllUsers(): Promise<User[]> {
        const response = await this.request<any>({
            method: 'GET',
            url: '/users',
        });
        // [修复] 兼容处理
        return response.data || response;
    }

    async getUserById(id: string): Promise<User> {
        if (!id) {
            throw new Error('getUserById: ID is required');
        }
        console.log('getUserById called with ID:', id);

        try {
            const response = await this.request<any>({
                method: 'GET',
                url: `/users/${id}`,
            });

            console.log('getUserById: Response received from API:', response);

            // [修复] 兼容处理：如果返回的数据包含 data 字段，则使用 data 字段
            const user = response.data || response;

            // Validate user response
            if (!user || !user.id) {
                console.error('getUserById: Invalid user response:', user);
                throw new Error('Invalid user data received from server');
            }

            console.log('getUserById: Valid user received:', user);
            return user;
        } catch (error: any) {
            console.error('getUserById API error:', error);
            console.error('Error response:', error.response?.data);
            throw error;
        }
    }

    // [新增] 更新用户信息接口
    async updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User> {
        const response = await this.request<any>({
            method: 'PUT',
            url: `/users/${id}`,
            data,
        });
        // [修复] 同样处理 updateUser 的返回值
        return response.data || response;
    }

    async getOnlineUsers(): Promise<User[]> {
        const response = await this.request<{success: boolean; data: User[]}>({
            method: 'GET',
            url: '/users/online/list',
        });
        return response.data || [];
    }

    async healthCheck(): Promise<any> {
        return this.request<any>({
            method: 'GET',
            url: '/health',
        });
    }

    setToken(token: string): void {
        localStorage.setItem('token', token);
    }

    getToken(): string | null {
        const token = localStorage.getItem('token');
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
                localStorage.removeItem('user');
                return null;
            }
        }
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