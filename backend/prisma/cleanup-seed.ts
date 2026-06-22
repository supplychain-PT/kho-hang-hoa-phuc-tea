import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Dọn dẹp dữ liệu mẫu (seed)...\n');

  // 1. Xóa toàn bộ đơn hàng (đây đều là dữ liệu test)
  const deletedPayments = await prisma.payment.deleteMany({});
  const deletedItems = await prisma.orderItem.deleteMany({});
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`✅ Đã xóa: ${deletedOrders.count} đơn hàng, ${deletedItems.count} chi tiết, ${deletedPayments.count} thanh toán`);

  // 2. Đọc danh sách cửa hàng từ Excel để biết code nào là hợp lệ
  const storesRaw = fs.readFileSync(path.join(__dirname, 'stores_data.json'), 'utf-8');
  const storesData: any[] = JSON.parse(storesRaw);
  const validStoreCodes = new Set(storesData.map(s => s.code.split(' - ')[0].trim()));

  // 3. Xóa stores không có trong Excel
  const allStores = await prisma.store.findMany({ select: { id: true, code: true } });
  const seedStores = allStores.filter(s => !validStoreCodes.has(s.code));
  if (seedStores.length > 0) {
    await prisma.store.deleteMany({ where: { id: { in: seedStores.map(s => s.id) } } });
    console.log(`✅ Đã xóa ${seedStores.length} cửa hàng mẫu: ${seedStores.map(s => s.code).join(', ')}`);
  }

  // 4. Đọc danh sách sản phẩm từ Excel
  const productsRaw = fs.readFileSync(path.join(__dirname, 'products_data.json'), 'utf-8');
  const productsData: any[] = JSON.parse(productsRaw);
  const validProductCodes = new Set(productsData.map(p => p.code));

  // 5. Xóa products không có trong Excel
  const allProducts = await prisma.product.findMany({ select: { id: true, code: true } });
  const seedProducts = allProducts.filter(p => !validProductCodes.has(p.code));
  if (seedProducts.length > 0) {
    await prisma.product.deleteMany({ where: { id: { in: seedProducts.map(p => p.id) } } });
    console.log(`✅ Đã xóa ${seedProducts.length} sản phẩm mẫu`);
  }

  // 6. Xóa users STORE_OWNER không có trong Excel (email không đúng format .ccn)
  // Và xóa các users không phải ADMIN/WAREHOUSE_STAFF/ACCOUNTANT/STORE_OWNER hợp lệ
  // Lấy tên chủ cửa hàng từ Excel
  const validOwnerNames = new Set(storesData.map(s => s.ownerName));

  const allStoreOwners = await prisma.user.findMany({
    where: { role: 'STORE_OWNER' },
    select: { id: true, fullName: true, email: true },
  });

  const seedOwners = allStoreOwners.filter(u => !validOwnerNames.has(u.fullName));
  if (seedOwners.length > 0) {
    // First remove their stores' ownerId references
    await prisma.store.updateMany({
      where: { ownerId: { in: seedOwners.map(u => u.id) } },
      data: { ownerId: undefined as any },
    });
    await prisma.user.deleteMany({ where: { id: { in: seedOwners.map(u => u.id) } } });
    console.log(`✅ Đã xóa ${seedOwners.length} tài khoản chủ cửa hàng mẫu`);
  }

  // 7. Xóa categories không có sản phẩm nào
  const emptyCats = await prisma.productCategory.findMany({
    where: { products: { none: {} } },
    select: { id: true, name: true },
  });
  if (emptyCats.length > 0) {
    await prisma.productCategory.deleteMany({ where: { id: { in: emptyCats.map(c => c.id) } } });
    console.log(`✅ Đã xóa ${emptyCats.length} danh mục trống: ${emptyCats.map(c => c.name).join(', ')}`);
  }

  const [users, stores, products, categories] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.product.count(),
    prisma.productCategory.count(),
  ]);

  console.log(`\n📊 Tổng kết sau dọn dẹp:`);
  console.log(`   👤 Users: ${users}`);
  console.log(`   🏪 Stores: ${stores}`);
  console.log(`   📦 Products: ${products}`);
  console.log(`   📁 Categories: ${categories}`);
  console.log(`\n✨ Dọn dẹp xong! Bây giờ chạy lại import-stores và import-products.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
