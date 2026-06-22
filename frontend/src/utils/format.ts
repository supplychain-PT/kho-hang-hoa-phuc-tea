import { OrderStatus, PaymentMethod } from '../types';

/**
 * Format number as Vietnamese currency
 * e.g. 1590000 → "1.590.000 đ"
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

/**
 * Format date as Vietnamese format
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/**
 * Get Vietnamese label for OrderStatus
 */
export const getOrderStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    DRAFT: 'Phiếu Tạm',
    APPROVED: 'Đã Duyệt',
    SHIPPING: 'Đang Giao',
    COMPLETED: 'Hoàn Thành',
    CANCELLED: 'Đã Hủy',
  };
  return labels[status] || status;
};

export const getOrderStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    DRAFT: 'default',
    APPROVED: 'blue',
    SHIPPING: 'orange',
    COMPLETED: 'green',
    CANCELLED: 'red',
  };
  return colors[status] || 'default';
};

export const getPaymentMethodLabel = (method: PaymentMethod | null | undefined): string => {
  if (!method) return '—';
  return method === 'CASH' ? 'Tiền Mặt' : 'Chuyển Khoản';
};

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    ADMIN: 'Quản Trị Viên',
    WAREHOUSE_STAFF: 'Nhân Viên Kho',
    ACCOUNTANT: 'Kế Toán',
    STORE_OWNER: 'Chủ Cửa Hàng',
  };
  return labels[role] || role;
};
