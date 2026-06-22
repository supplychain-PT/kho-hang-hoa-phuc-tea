# Phúc Tea | The Hoa - Hệ Thống Quản Lý Đặt Hàng Nhượng Quyền

Hệ thống B2B quản lý đặt hàng nguyên liệu nhượng quyền cho 2 thương hiệu: **PHÚC TEA** và **THE HOA**.

## Cấu Trúc Dự Án

```
KIOTVIET/
├── backend/          # NestJS + TypeScript + Prisma + PostgreSQL
└── frontend/         # React + TypeScript + Vite + Ant Design 5
```

## Yêu Cầu Hệ Thống

- Node.js >= 18.x
- PostgreSQL 14+ (port 5432)
- Redis (port 6379) - tùy chọn
- npm hoặc yarn

## Cài Đặt & Chạy

### 1. Tạo Database PostgreSQL

```sql
CREATE DATABASE kiotviet_db;
```

### 2. Cài đặt Backend

```bash
cd backend
npm install
```

**Cấu hình .env** (đã tạo sẵn, kiểm tra lại):
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kiotviet_db?schema=public"
JWT_SECRET=phuctea-thehoa-franchise-secret-key-2024-super-secure
PORT=3001
```

**Chạy Prisma migration và seed:**
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

**Khởi động backend:**
```bash
npm run start:dev
```
Backend chạy tại: http://localhost:3001
Swagger docs: http://localhost:3001/api/docs

### 3. Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend chạy tại: http://localhost:3000

## Tài Khoản Demo

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Admin | admin@phuctea.vn | Admin@123456 |
| Nhân viên kho | warehouse@phuctea.vn | Warehouse@123456 |
| Kế toán | accountant@phuctea.vn | Accountant@123456 |
| Chủ cửa hàng | cao.thi.diem.tram@phuctea.vn | Owner@123456 |
| Chủ cửa hàng | nguyen.ngo.cuong@phuctea.vn | Owner@123456 |

## Phân Quyền

| Tính năng | ADMIN | KHO | KẾ TOÁN | CHỦ CH |
|-----------|-------|-----|---------|--------|
| Xem sản phẩm (có giá vốn) | ✅ | ✅ | ✅ | ❌ |
| Xem sản phẩm (chỉ giá bán) | ✅ | ✅ | ✅ | ✅ |
| Quản lý sản phẩm | ✅ | ❌ | ❌ | ❌ |
| Xem tất cả cửa hàng | ✅ | ❌ | ✅ | ❌ |
| Xem cửa hàng của mình | ✅ | ❌ | ✅ | ✅ |
| Tạo đơn hàng | ✅ | ❌ | ❌ | ✅ |
| Duyệt/Giao đơn | ✅ | ✅ | ❌ | ❌ |
| Quản lý công nợ | ✅ | ❌ | ✅ | ❌ |
| Báo cáo | ✅ | ❌ | ✅ | ❌ |
| Quản lý tài khoản | ✅ | ❌ | ❌ | ❌ |

## Luồng Đơn Hàng

```
PHIẾU TẠM → ĐÃ DUYỆT → ĐANG GIAO → HOÀN THÀNH
     ↓ (chỉ khi PHIẾU TẠM)
  ĐÃ HỦY
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/refresh` - Làm mới token
- `GET /api/auth/me` - Thông tin tài khoản

### Products
- `GET /api/products` - Danh sách sản phẩm
- `GET /api/products/categories` - Nhóm hàng
- `POST /api/products` - Tạo sản phẩm (Admin)
- `PATCH /api/products/:id` - Cập nhật (Admin)

### Orders
- `GET /api/orders` - Danh sách đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `PATCH /api/orders/:id/approve` - Duyệt
- `PATCH /api/orders/:id/ship` - Giao hàng
- `PATCH /api/orders/:id/complete` - Hoàn thành
- `PATCH /api/orders/:id/cancel` - Hủy

### Payments
- `GET /api/payments/debts` - Danh sách công nợ
- `GET /api/payments/debts/by-owner` - Công nợ theo chủ CH
- `POST /api/payments/order/:orderId/pay` - Ghi nhận thanh toán

## Dữ Liệu Mẫu

- **52 cửa hàng** (PHÚC TEA + THE HOA)
- **~70 sản phẩm** thuộc 9 nhóm hàng
- Đơn hàng mẫu ở các trạng thái khác nhau

## Tech Stack

**Backend:**
- NestJS 10 + TypeScript
- Prisma ORM + PostgreSQL
- JWT Authentication
- Swagger/OpenAPI docs

**Frontend:**
- React 18 + TypeScript + Vite
- Ant Design 5.x
- TanStack Query (React Query)
- Zustand (state management)
- React Router v6
