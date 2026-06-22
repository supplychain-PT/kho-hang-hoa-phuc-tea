import api from './api';

export const purchaseReceiptsService = {
  getAll: async (query: any = {}) => {
    const { data } = await api.get('/purchase-receipts', { params: query });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/purchase-receipts/${id}`);
    return data;
  },
  create: async (payload: {
    note?: string;
    items: Array<{ productId: string; quantity: number; costPrice: number }>;
  }) => {
    const { data } = await api.post('/purchase-receipts', payload);
    return data;
  },
  complete: async (id: string) => {
    const { data } = await api.patch(`/purchase-receipts/${id}/complete`);
    return data;
  },
  remove: async (id: string) => {
    const { data } = await api.delete(`/purchase-receipts/${id}`);
    return data;
  },
};
