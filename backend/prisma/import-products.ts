import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Bắt đầu import sản phẩm từ Excel...');

  const raw = fs.readFileSync(path.join(__dirname, 'products_data.json'), 'utf-8');
  const products = JSON.parse(raw);

  // Lấy danh sách category hiện có
  const categories = await prisma.productCategory.findMany();
  const catMap: Record<string, string> = {};
  for (const c of categories) {
    catMap[c.name] = c.id;
  }

  // Tạo category còn thiếu
  const uniqueCats: string[] = [...new Set<string>(products.map((p: any) => p.category as string))];
  for (const catName of uniqueCats) {
    if (!catMap[catName]) {
      const code = (catName as string).replace(/\s+/g, '_').toUpperCase();
      const cat = await prisma.productCategory.upsert({
        where: { code },
        update: {},
        create: { name: catName, code },
      });
      catMap[catName] = cat.id;
      console.log(`  ✅ Tạo nhóm hàng: ${catName}`);
    }
  }

  // Xóa sản phẩm cũ (giữ lại đơn hàng)
  const existingCodes = new Set(
    (await prisma.product.findMany({ select: { code: true } })).map((p) => p.code)
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    const categoryId = catMap[p.category];
    if (!categoryId) {
      console.warn(`  ⚠️ Không tìm thấy nhóm: ${p.category} cho SP: ${p.name}`);
      skipped++;
      continue;
    }

    try {
      if (existingCodes.has(p.code)) {
        await prisma.product.update({
          where: { code: p.code },
          data: {
            name: p.name,
            sellingPrice: p.sellingPrice,
            costPrice: p.costPrice,
            stock: p.stock,
            minStock: p.minStock,
            unit: p.unit,
            categoryId,
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            code: p.code,
            name: p.name,
            sellingPrice: p.sellingPrice,
            costPrice: p.costPrice,
            stock: p.stock,
            minStock: p.minStock,
            unit: p.unit,
            categoryId,
          },
        });
        created++;
      }
    } catch (e: any) {
      console.warn(`  ⚠️ Lỗi SP ${p.code}: ${e.message}`);
      skipped++;
    }
  }

  const total = await prisma.product.count();
  console.log(`\n🎉 Import hoàn tất!`);
  console.log(`   ➕ Tạo mới: ${created} sản phẩm`);
  console.log(`   ✏️  Cập nhật: ${updated} sản phẩm`);
  console.log(`   ⚠️  Bỏ qua: ${skipped} sản phẩm`);
  console.log(`   📊 Tổng trong DB: ${total} sản phẩm`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
