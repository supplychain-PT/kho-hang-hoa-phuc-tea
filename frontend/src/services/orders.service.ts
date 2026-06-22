import api from './api';
import { Order, PaginatedResponse, DashboardStats } from '../types';

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  statusIn?: string;
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface CreateOrderPayload {
  storeId: string;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export const ordersService = {
  getDashboard: async (): Promise<{ stats: DashboardStats; recentOrders: Order[] }> => {
    const { data } = await api.get('/orders/dashboard');
    return data;
  },

  getAll: async (query: OrderQuery = {}): Promise<PaginatedResponse<Order>> => {
    const { data } = await api.get('/orders', { params: query });
    return data;
  },

  getById: async (id: string): Promise<Order> => {
    const { data } = await api.get(`/orders/${id}`);
    return data;
  },

  create: async (payload: CreateOrderPayload): Promise<Order> => {
    const { data } = await api.post('/orders', payload);
    return data;
  },

  approve: async (id: string): Promise<Order> => {
    const { data } = await api.patch(`/orders/${id}/approve`);
    return data;
  },

  ship: async (id: string): Promise<Order> => {
    const { data } = await api.patch(`/orders/${id}/ship`);
    return data;
  },

  complete: async (id: string): Promise<Order> => {
    const { data } = await api.patch(`/orders/${id}/complete`);
    return data;
  },

  cancel: async (id: string): Promise<Order> => {
    const { data } = await api.patch(`/orders/${id}/cancel`);
    return data;
  },

  deleteOrder: async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete(`/orders/${id}`);
    return data;
  },

  exportOrders: async (query: OrderQuery = {}): Promise<any[]> => {
    const { data } = await api.get('/orders/export', { params: query });
    return data;
  },

  processOrder: async (id: string, payload: {
    items: Array<{ productId: string; quantity: number }>;
    payNow: boolean;
    paymentMethod?: string;
    note?: string;
  }): Promise<Order> => {
    const { data } = await api.patch(`/orders/${id}/process`, payload);
    return data;
  },
};
