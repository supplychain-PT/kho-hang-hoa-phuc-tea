import api from './api';
import { User, PaginatedResponse } from '../types';

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export const usersService = {
  getAll: async (query: UserQuery = {}): Promise<PaginatedResponse<User>> => {
    const { data } = await api.get('/users', { params: query });
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  create: async (payload: Partial<User> & { password: string }): Promise<User> => {
    const { data } = await api.post('/users', payload);
    return data;
  },

  update: async (id: string, payload: Partial<User> & { password?: string }): Promise<User> => {
    const { data } = await api.patch(`/users/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
