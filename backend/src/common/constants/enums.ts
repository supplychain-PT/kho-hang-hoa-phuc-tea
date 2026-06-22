export const Role = {
  ADMIN: 'ADMIN',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  ACCOUNTANT: 'ACCOUNTANT',
  STORE_OWNER: 'STORE_OWNER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderStatus = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
