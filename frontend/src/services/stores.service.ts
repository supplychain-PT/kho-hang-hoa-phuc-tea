import api from './api';
import { Store, PaginatedResponse } from '../types';

export interface StoreQuery {
  page?: number;
  limit?: number;
  search?: string;
  ownerId?: string;
}

export const storesService = {
  getAll: async (query: StoreQuery = {}): Promise<PaginatedResponse<Store>> => {
    const { data } = await api.get('/stores', { params: query });
    return data;
  },

  getById: async (id: string): Promise<Store> => {
    const { data } = await api.get(`/stores/${id}`);
    return data;
  },

  create: async (payload: Partial<Store>): Promise<Store> => {
    const { data } = await api.post('/stores', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Store>): Promise<Store> => {
    const { data } = await api.patch(`/stores/${id}`, payload);
    return data;
  },
};
