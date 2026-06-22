import api from './api';
import { Payment, PaginatedResponse } from '../types';

export interface PaymentQuery {
  page?: number;
  limit?: number;
  isPaid?: boolean;
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RecordPaymentPayload {
  paidAmount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  note?: string;
}

export interface DebtByOwner {
  owner: { id: string; fullName: string; phone?: string; email: string };
  totalDebt: number;
  orderCount: number;
  orders: Array<{
    orderId: string;
    orderNumber: string;
    storeName: string;
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
  }>;
}

export const paymentsService = {
  getAll: async (query: PaymentQuery = {}): Promise<PaginatedResponse<Payment & { order: any }>> => {
    const { data } = await api.get('/payments', { params: query });
    return data;
  },

  getDebts: async (query: PaymentQuery = {}): Promise<any> => {
    const { data } = await api.get('/payments/debts', { params: query });
    return data;
  },

  getDebtByOwner: async (): Promise<DebtByOwner[]> => {
    const { data } = await api.get('/payments/debts/by-owner');
    return data;
  },

  getByOrderId: async (orderId: string): Promise<Payment> => {
    const { data } = await api.get(`/payments/order/${orderId}`);
    return data;
  },

  recordPayment: async (orderId: string, payload: RecordPaymentPayload): Promise<Payment> => {
    const { data } = await api.post(`/payments/order/${orderId}/pay`, payload);
    return data;
  },
};
