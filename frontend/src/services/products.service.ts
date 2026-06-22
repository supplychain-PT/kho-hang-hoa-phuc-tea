import api from './api';
import { Product, ProductCategory, PaginatedResponse } from '../types';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export const productsService = {
  getAll: async (query: ProductQuery = {}): Promise<PaginatedResponse<Product>> => {
    const { data } = await api.get('/products', { params: query });
    return data;
  },

  getById: async (id: string): Promise<Product> => {
    const { data } = await api.get(`/products/${id}`);
    return data;
  },

  getStockMovements: async (id: string): Promise<{ product: any; movements: any[] }> => {
    const { data } = await api.get(`/products/${id}/stock-movements`);
    return data;
  },

  create: async (payload: Partial<Product>): Promise<Product> => {
    const { data } = await api.post('/products', payload);
    return data;
  },

  update: async (id: string, payload: Partial<Product>): Promise<Product> => {
    const { data } = await api.patch(`/products/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  getCategories: async (): Promise<ProductCategory[]> => {
    const { data } = await api.get('/products/categories');
    return data;
  },

  createCategory: async (payload: { name: string; code: string; sortOrder?: number }): Promise<ProductCategory> => {
    const { data } = await api.post('/products/categories', payload);
    return data;
  },
};
