import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function makeUsername(name: string): string {
  const map: Record<string, string> = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'ă':'a','ắ':'a','ặ':'a','ằ':'a','ẳ':'a','ẵ':'a',
    'â':'a','ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'đ':'d',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
  };
  // Full name no-diacritics, no spaces, lowercase + .ccn
  return name.toLowerCase()
    .split('').map(c => map[c] || c).join('')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '') + '.ccn';
}

async function main() {
  console.log('🏪 Bắt đầu import cửa hàng từ Excel...\n');

  const raw = fs.readFileSync(path.join(__dirname, 'stores_data.json'), 'utf-8');
  const stores: any[] = JSON.parse(raw);

  const password = await bcrypt.hash('Phuctea.3103', 10);

  // Group stores by owner
  const ownerMap = new Map<string, any[]>();
  for (const s of stores) {
    if (!ownerMap.has(s.ownerName)) ownerMap.set(s.ownerName, []);
    ownerMap.get(s.ownerName)!.push(s);
  }

  let ownersCreated = 0;
  let ownersUpdated = 0;
  let storesCreated = 0;
  let storesUpdated = 0;

  for (const [ownerName, ownerStores] of ownerMap) {
    const email = makeUsername(ownerName);
    const phone = ownerStores[0].phone?.split(' / ')[0]?.replace(/\s/g, '') || '';

    // Upsert owner account — tìm theo email mới, hoặc theo fullName (trường hợp đã có nhưng email khác format cũ)
    let existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      // Thử tìm theo fullName (đề phòng email cũ format khác)
      existing = await prisma.user.findFirst({ where: { fullName: ownerName, role: 'STORE_OWNER' } });
    }
    let owner;
    if (existing) {
      owner = await prisma.user.update({
        where: { id: existing.id },
        data: { email, fullName: ownerName, phone, role: 'STORE_OWNER', password },
      });
      ownersUpdated++;
    } else {
      owner = await prisma.user.create({
        data: { email, password, fullName: ownerName, phone, role: 'STORE_OWNER' },
      });
      ownersCreated++;
      console.log(`  ✅ Tạo tài khoản: ${ownerName} → ${email}`);
    }

    // Upsert stores
    for (const s of ownerStores) {
      // Use full code as in Excel (e.g. "PHUCTEA003 - TÔN ĐỨC THẮNG CAO LÃNH")
      const code = s.code.trim();

      const existingStore = await prisma.store.findUnique({ where: { code } });
      if (existingStore) {
        await prisma.store.update({
          where: { code },
          data: { name: s.name, address: s.address, phone: s.phone, ownerId: owner.id },
        });
        storesUpdated++;
      } else {
        await prisma.store.create({
          data: { code, name: s.name, address: s.address, phone: s.phone, ownerId: owner.id },
        });
        storesCreated++;
      }
    }
  }

  const totalOwners = await prisma.user.count({ where: { role: 'STORE_OWNER' } });
  const totalStores = await prisma.store.count();

  console.log(`\n🎉 Import hoàn tất!`);
  console.log(`   👤 Tài khoản: +${ownersCreated} tạo mới, ${ownersUpdated} cập nhật`);
  console.log(`   🏪 Cửa hàng: +${storesCreated} tạo mới, ${storesUpdated} cập nhật`);
  console.log(`   📊 Tổng trong DB: ${totalOwners} chủ cửa hàng, ${totalStores} cửa hàng`);
  console.log(`\n   🔑 Mật khẩu mặc định: Phuctea.3103`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
