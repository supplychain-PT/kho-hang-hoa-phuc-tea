export type Role = 'ADMIN' | 'WAREHOUSE_STAFF' | 'ACCOUNTANT' | 'STORE_OWNER';

export type OrderStatus = 'DRAFT' | 'APPROVED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  stores?: Store[];
}

export interface Store {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  ownerId: string;
  owner?: Pick<User, 'id' | 'fullName' | 'phone' | 'email'>;
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  _count?: { products: number };
}

export interface Product {
  id: string;
  code: string;
  name: string;
  sellingPrice: number;
  costPrice: number | null; // null for STORE_OWNER
  stock: number;
  minStock: number;
  unit: string;
  isActive: boolean;
  categoryId: string;
  category?: ProductCategory;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  sortOrder: number;
  product?: Pick<Product, 'id' | 'code' | 'name' | 'unit'>;
}

export interface Payment {
  id: string;
  orderId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  note?: string;
  isPaid: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber?: string;
  status: OrderStatus;
  totalAmount: number;
  discount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  shippedAt?: string;
  completedAt?: string;
  storeId: string;
  store?: Store;
  createdById: string;
  createdBy?: Pick<User, 'id' | 'fullName'>;
  items?: OrderItem[];
  payment?: Payment;
  _count?: { items: number };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: any;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface DashboardStats {
  total: number;
  pending: number;
  shipping: number;
  completed: number;
  totalDebt: number;
}
