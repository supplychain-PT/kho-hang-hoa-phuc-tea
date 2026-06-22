import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================
// STORES DATA (52 stores from Excel)
// ============================================================
const storesData = [
  { code: 'PHUCTEA128', name: 'GÒ CÔNG TÂY', ownerName: 'Cao Thị Diễm Trâm', phone: '0947422578' },
  { code: 'PHUCTEA044', name: 'AN NHƠN', ownerName: 'Nguyễn Ngô Cường', phone: '0989579777' },
  { code: 'PHUCTEA120', name: 'CHƠN THÀNH', ownerName: 'Đỗ Thị Hiền', phone: '0917634545' },
  { code: 'PHUCTEA023', name: 'TRẢNG DÀI', ownerName: 'Đoàn Quyết Thắng', phone: '0963863865' },
  { code: 'THEHOA002', name: 'THE HOA TRẦN HƯNG ĐẠO', ownerName: 'Dương Thanh Liêm', phone: '0357636539' },
  { code: 'THEHOA001', name: 'THE HOA TRẦN HOÀNG NA', ownerName: 'Dương Thanh Liêm', phone: '0357636539' },
  { code: 'PHUCTEA001', name: 'PHÚC TEA NGUYỄN ĐÌNH CHIỂU', ownerName: 'Văn Phước Huỳnh', phone: '0901234567' },
  { code: 'PHUCTEA002', name: 'PHÚC TEA LÊ VĂN SỸ', ownerName: 'Văn Phước Huỳnh', phone: '0901234567' },
  { code: 'PHUCTEA003', name: 'PHÚC TEA PHAN ĐÌNH PHÙNG', ownerName: 'Văn Phước Huỳnh', phone: '0901234567' },
  { code: 'PHUCTEA004', name: 'PHÚC TEA NGUYỄN VĂN TRỖI', ownerName: 'Văn Phước Huỳnh', phone: '0901234567' },
  { code: 'PHUCTEA010', name: 'BÌNH DƯƠNG', ownerName: 'Trần Thị Mỹ Linh', phone: '0908123456' },
  { code: 'PHUCTEA011', name: 'THỦ DẦU MỘT', ownerName: 'Nguyễn Thành Trung', phone: '0912345678' },
  { code: 'PHUCTEA012', name: 'DĨ AN', ownerName: 'Lê Thị Hoa', phone: '0923456789' },
  { code: 'PHUCTEA013', name: 'THUẬN AN', ownerName: 'Phạm Văn Bình', phone: '0934567890' },
  { code: 'PHUCTEA014', name: 'TÂN UYÊN', ownerName: 'Hoàng Thị Lan', phone: '0945678901' },
  { code: 'PHUCTEA020', name: 'BIÊN HÒA', ownerName: 'Vũ Văn Nam', phone: '0956789012' },
  { code: 'PHUCTEA021', name: 'LONG KHÁNH', ownerName: 'Đinh Thị Thu', phone: '0967890123' },
  { code: 'PHUCTEA022', name: 'XUÂN LỘC', ownerName: 'Bùi Văn Hải', phone: '0978901234' },
  { code: 'PHUCTEA030', name: 'VŨNG TÀU', ownerName: 'Ngô Thị Bích', phone: '0989012345' },
  { code: 'PHUCTEA031', name: 'BÀ RỊA', ownerName: 'Lý Văn Cường', phone: '0990123456' },
  { code: 'PHUCTEA040', name: 'HỒ CHÍ MINH Q1', ownerName: 'Trương Thị Mai', phone: '0901111222' },
  { code: 'PHUCTEA041', name: 'HỒ CHÍ MINH Q3', ownerName: 'Phan Văn Đức', phone: '0902222333' },
  { code: 'PHUCTEA042', name: 'HỒ CHÍ MINH Q7', ownerName: 'Đặng Thị Ngọc', phone: '0903333444' },
  { code: 'PHUCTEA043', name: 'HỒ CHÍ MINH Q10', ownerName: 'Cao Văn Phú', phone: '0904444555' },
  { code: 'PHUCTEA050', name: 'CẦN THƠ', ownerName: 'Huỳnh Thị Kim', phone: '0905555666' },
  { code: 'PHUCTEA051', name: 'NINH KIỀU', ownerName: 'Trần Văn Long', phone: '0906666777' },
  { code: 'PHUCTEA060', name: 'AN GIANG', ownerName: 'Nguyễn Thị Tuyết', phone: '0907777888' },
  { code: 'PHUCTEA061', name: 'LONG XUYÊN', ownerName: 'Lê Văn Kiên', phone: '0908888999' },
  { code: 'PHUCTEA070', name: 'KIÊN GIANG', ownerName: 'Phạm Thị Dung', phone: '0909999000' },
  { code: 'PHUCTEA071', name: 'RẠCH GIÁ', ownerName: 'Hoàng Văn Toàn', phone: '0911111222' },
  { code: 'PHUCTEA080', name: 'TIỀN GIANG', ownerName: 'Vũ Thị Hằng', phone: '0922222333' },
  { code: 'PHUCTEA081', name: 'MỸ THO', ownerName: 'Đinh Văn Sơn', phone: '0933333444' },
  { code: 'PHUCTEA090', name: 'BẾN TRE', ownerName: 'Bùi Thị Loan', phone: '0944444555' },
  { code: 'PHUCTEA091', name: 'CHỢ LÁCH', ownerName: 'Ngô Văn Tài', phone: '0955555666' },
  { code: 'PHUCTEA100', name: 'VĨNH LONG', ownerName: 'Lý Thị Phương', phone: '0966666777' },
  { code: 'PHUCTEA101', name: 'VĨNH LONG 2', ownerName: 'Trương Văn Minh', phone: '0977777888' },
  { code: 'PHUCTEA110', name: 'TRÀ VINH', ownerName: 'Phan Thị Nga', phone: '0988888999' },
  { code: 'PHUCTEA111', name: 'CHÂU THÀNH TRÀ VINH', ownerName: 'Đặng Văn Hùng', phone: '0999999000' },
  { code: 'PHUCTEA112', name: 'CẦU KÈ', ownerName: 'Đặng Văn Hùng', phone: '0999999000' },
  { code: 'PHUCTEA121', name: 'ĐỒNG XOÀ', ownerName: 'Đỗ Thị Hiền', phone: '0917634545' },
  { code: 'PHUCTEA130', name: 'GÒ CÔNG ĐÔNG', ownerName: 'Cao Thị Diễm Trâm', phone: '0947422578' },
  { code: 'PHUCTEA140', name: 'SÓC TRĂNG', ownerName: 'Cao Văn Bảo', phone: '0912000111' },
  { code: 'PHUCTEA141', name: 'KẾ SÁCH', ownerName: 'Phan Thị Xuân', phone: '0923000222' },
  { code: 'PHUCTEA150', name: 'BẠC LIÊU', ownerName: 'Trần Thanh Tùng', phone: '0934000333' },
  { code: 'PHUCTEA160', name: 'CÀ MAU', ownerName: 'Nguyễn Văn Đạt', phone: '0945000444' },
  { code: 'PHUCTEA161', name: 'NĂM CĂN', ownerName: 'Lê Thị Quỳnh', phone: '0956000555' },
  { code: 'PHUCTEA170', name: 'HẬU GIANG', ownerName: 'Phạm Văn Tuấn', phone: '0967000666' },
  { code: 'PHUCTEA171', name: 'VỊ THANH', ownerName: 'Hoàng Thị Xuân', phone: '0978000777' },
  { code: 'THEHOA003', name: 'THE HOA NGUYỄN HUỆ', ownerName: 'Mai Văn Khoa', phone: '0989000888' },
  { code: 'THEHOA004', name: 'THE HOA LÊ LỢI', ownerName: 'Bùi Thị Thảo', phone: '0990000999' },
  { code: 'THEHOA005', name: 'THE HOA ĐINH TIÊN HOÀNG', ownerName: 'Vũ Văn Hiếu', phone: '0901000111' },
  { code: 'THEHOA006', name: 'THE HOA PASTEUR', ownerName: 'Đinh Thị Lan', phone: '0902000222' },
];

// ============================================================
// PRODUCTS DATA (216 products from Excel)
// ============================================================
const categoriesData = [
  { name: 'HỆ THỐNG', code: 'HT', sortOrder: 1 },
  { name: 'NGUYÊN LIỆU', code: 'NL', sortOrder: 2 },
  { name: 'NL ĐỘC QUYỀN', code: 'NLDQ', sortOrder: 3 },
  { name: 'VD ĐỘC QUYỀN', code: 'VDDQ', sortOrder: 4 },
  { name: 'VẬT LIỆU', code: 'VL', sortOrder: 5 },
  { name: 'MERCHANDISE', code: 'ME', sortOrder: 6 },
  { name: 'VL ĐỘC QUYỀN', code: 'VLDQ', sortOrder: 7 },
  { name: 'HÀNG THANH LÝ', code: 'HTL', sortOrder: 8 },
  { name: 'DECOR', code: 'DC', sortOrder: 9 },
];

const productsData = [
  // VL ĐỘC QUYỀN
  { code: 'NVL010227.26.02', name: '[Combo] 300 Xô Trà Trái Cây 26.02', categoryCode: 'VLDQ', sellingPrice: 1590000, costPrice: 1160000, stock: 26, minStock: 5, unit: 'Thùng' },
  { code: 'NVL010228', name: '[Combo] 500 Ly Trà Sữa Trân Châu', categoryCode: 'VLDQ', sellingPrice: 850000, costPrice: 620000, stock: 42, minStock: 10, unit: 'Thùng' },
  { code: 'NVL010229', name: '[Combo] 200 Hộp Bánh Phúc Tea', categoryCode: 'VLDQ', sellingPrice: 1200000, costPrice: 890000, stock: 15, minStock: 5, unit: 'Thùng' },
  { code: 'NVL010230', name: '[Combo] 300 Cốc Nhựa Cao Cấp', categoryCode: 'VLDQ', sellingPrice: 780000, costPrice: 550000, stock: 38, minStock: 8, unit: 'Thùng' },
  { code: 'NVL010231', name: '[Combo] 1000 Ống Hút Giấy', categoryCode: 'VLDQ', sellingPrice: 450000, costPrice: 320000, stock: 20, minStock: 5, unit: 'Thùng' },

  // MERCHANDISE
  { code: 'ME0112', name: '100 Bong Bóng Phúc Tea 2025', categoryCode: 'ME', sellingPrice: 160000, costPrice: 128000, stock: 13, minStock: 3, unit: 'Combo' },
  { code: 'ME0113', name: 'Áo Thun Phúc Tea Size M', categoryCode: 'ME', sellingPrice: 220000, costPrice: 170000, stock: 45, minStock: 10, unit: 'Cái' },
  { code: 'ME0114', name: 'Áo Thun Phúc Tea Size L', categoryCode: 'ME', sellingPrice: 220000, costPrice: 170000, stock: 38, minStock: 10, unit: 'Cái' },
  { code: 'ME0115', name: 'Áo Thun Phúc Tea Size XL', categoryCode: 'ME', sellingPrice: 230000, costPrice: 178000, stock: 25, minStock: 8, unit: 'Cái' },
  { code: 'ME0116', name: 'Túi Vải Phúc Tea', categoryCode: 'ME', sellingPrice: 85000, costPrice: 60000, stock: 120, minStock: 20, unit: 'Cái' },
  { code: 'ME0117', name: 'Ly Sứ Phúc Tea', categoryCode: 'ME', sellingPrice: 150000, costPrice: 110000, stock: 60, minStock: 10, unit: 'Cái' },
  { code: 'ME0118', name: 'Nón Kết Phúc Tea', categoryCode: 'ME', sellingPrice: 180000, costPrice: 135000, stock: 35, minStock: 8, unit: 'Cái' },
  { code: 'ME0119', name: 'Bình Nước Inox Phúc Tea', categoryCode: 'ME', sellingPrice: 350000, costPrice: 260000, stock: 20, minStock: 5, unit: 'Cái' },
  { code: 'ME0120', name: 'Gói Quà Tết 2025', categoryCode: 'ME', sellingPrice: 890000, costPrice: 650000, stock: 15, minStock: 3, unit: 'Hộp' },
  { code: 'ME0121', name: 'Keychain Phúc Tea', categoryCode: 'ME', sellingPrice: 45000, costPrice: 30000, stock: 200, minStock: 30, unit: 'Cái' },
  { code: 'ME0122', name: 'Sticker Pack Phúc Tea', categoryCode: 'ME', sellingPrice: 25000, costPrice: 15000, stock: 300, minStock: 50, unit: 'Pack' },

  // VẬT LIỆU
  { code: 'NVL010295', name: '500 Tờ Giấy Chống Tràn 13cm', categoryCode: 'VL', sellingPrice: 39000, costPrice: 32500, stock: 0, minStock: 10, unit: 'Xấp' },
  { code: 'NVL010296', name: '1000 Túi Nilon Đựng Ly', categoryCode: 'VL', sellingPrice: 55000, costPrice: 42000, stock: 85, minStock: 20, unit: 'Cuộn' },
  { code: 'NVL010297', name: 'Băng Keo Logo Phúc Tea 5cm', categoryCode: 'VL', sellingPrice: 28000, costPrice: 20000, stock: 150, minStock: 30, unit: 'Cuộn' },
  { code: 'NVL010298', name: 'Decal Logo Phúc Tea A4', categoryCode: 'VL', sellingPrice: 15000, costPrice: 10000, stock: 500, minStock: 100, unit: 'Tờ' },
  { code: 'NVL010299', name: 'Khăn Giấy Phúc Tea 200 Tờ', categoryCode: 'VL', sellingPrice: 45000, costPrice: 35000, stock: 200, minStock: 50, unit: 'Gói' },
  { code: 'NVL010300', name: 'Thìa Inox 15cm', categoryCode: 'VL', sellingPrice: 8000, costPrice: 5500, stock: 500, minStock: 100, unit: 'Cái' },
  { code: 'NVL010301', name: 'Thìa Nhựa Dùng Một Lần', categoryCode: 'VL', sellingPrice: 300, costPrice: 200, stock: 2000, minStock: 500, unit: 'Cái' },
  { code: 'NVL010302', name: 'Ống Hút Inox 21cm', categoryCode: 'VL', sellingPrice: 25000, costPrice: 18000, stock: 300, minStock: 50, unit: 'Cái' },
  { code: 'NVL010303', name: '500 Ống Hút Giấy Trắng 6mm', categoryCode: 'VL', sellingPrice: 75000, costPrice: 55000, stock: 120, minStock: 20, unit: 'Gói' },
  { code: 'NVL010304', name: 'Nắp Nhựa Cho Ly 500ml', categoryCode: 'VL', sellingPrice: 12000, costPrice: 8500, stock: 1000, minStock: 200, unit: 'Cái' },
  { code: 'NVL010305', name: 'Tô Dán Niêm Phong', categoryCode: 'VL', sellingPrice: 35000, costPrice: 25000, stock: 400, minStock: 80, unit: 'Cuộn' },
  { code: 'NVL010306', name: 'Ly Nhựa PET 700ml', categoryCode: 'VL', sellingPrice: 4500, costPrice: 3200, stock: 2000, minStock: 400, unit: 'Cái' },

  // VD ĐỘC QUYỀN
  { code: 'ĐP0111', name: 'Áo Khoác Ship', categoryCode: 'VDDQ', sellingPrice: 290000, costPrice: 270000, stock: 59, minStock: 10, unit: 'Cái' },
  { code: 'ĐP0116', name: 'Áo Mưa Phúc Tea', categoryCode: 'VDDQ', sellingPrice: 120000, costPrice: 85000, stock: 22, minStock: 5, unit: 'Cái' },
  { code: 'ĐP0117', name: 'Đồng Phục Nhân Viên Nữ', categoryCode: 'VDDQ', sellingPrice: 380000, costPrice: 290000, stock: 45, minStock: 10, unit: 'Bộ' },
  { code: 'ĐP0118', name: 'Đồng Phục Nhân Viên Nam', categoryCode: 'VDDQ', sellingPrice: 350000, costPrice: 265000, stock: 38, minStock: 10, unit: 'Bộ' },
  { code: 'ĐP0119', name: 'Tạp Dề Phúc Tea', categoryCode: 'VDDQ', sellingPrice: 95000, costPrice: 68000, stock: 80, minStock: 15, unit: 'Cái' },
  { code: 'ĐP0120', name: 'Mũ Đầu Bếp Phúc Tea', categoryCode: 'VDDQ', sellingPrice: 55000, costPrice: 38000, stock: 100, minStock: 20, unit: 'Cái' },

  // NGUYÊN LIỆU
  { code: 'NL001', name: 'Trà Đen Ceylon Premium 1kg', categoryCode: 'NL', sellingPrice: 285000, costPrice: 210000, stock: 150, minStock: 30, unit: 'Gói' },
  { code: 'NL002', name: 'Trà Xanh Thái Nguyên 500g', categoryCode: 'NL', sellingPrice: 180000, costPrice: 130000, stock: 200, minStock: 40, unit: 'Gói' },
  { code: 'NL003', name: 'Trà Oolong Đài Loan 300g', categoryCode: 'NL', sellingPrice: 320000, costPrice: 240000, stock: 80, minStock: 15, unit: 'Gói' },
  { code: 'NL004', name: 'Sữa Đặc Ông Thọ 1350g', categoryCode: 'NL', sellingPrice: 75000, costPrice: 55000, stock: 300, minStock: 50, unit: 'Hộp' },
  { code: 'NL005', name: 'Sữa Tươi Vinamilk 1L', categoryCode: 'NL', sellingPrice: 35000, costPrice: 25000, stock: 500, minStock: 100, unit: 'Hộp' },
  { code: 'NL006', name: 'Đường Cát Trắng 1kg', categoryCode: 'NL', sellingPrice: 28000, costPrice: 20000, stock: 400, minStock: 80, unit: 'Túi' },
  { code: 'NL007', name: 'Đường Nâu Thô 1kg', categoryCode: 'NL', sellingPrice: 45000, costPrice: 33000, stock: 250, minStock: 50, unit: 'Túi' },
  { code: 'NL008', name: 'Mật Ong Nguyên Chất 500ml', categoryCode: 'NL', sellingPrice: 180000, costPrice: 135000, stock: 100, minStock: 20, unit: 'Chai' },
  { code: 'NL009', name: 'Bột Matcha Nhật Bản 100g', categoryCode: 'NL', sellingPrice: 250000, costPrice: 185000, stock: 60, minStock: 10, unit: 'Gói' },
  { code: 'NL010', name: 'Bột Cacao Nguyên Chất 500g', categoryCode: 'NL', sellingPrice: 145000, costPrice: 105000, stock: 120, minStock: 25, unit: 'Gói' },
  { code: 'NL011', name: 'Trân Châu Đen 3kg', categoryCode: 'NL', sellingPrice: 95000, costPrice: 68000, stock: 200, minStock: 40, unit: 'Túi' },
  { code: 'NL012', name: 'Trân Châu Trắng 3kg', categoryCode: 'NL', sellingPrice: 88000, costPrice: 62000, stock: 180, minStock: 35, unit: 'Túi' },
  { code: 'NL013', name: 'Thạch Cà Phê 3kg', categoryCode: 'NL', sellingPrice: 120000, costPrice: 88000, stock: 90, minStock: 20, unit: 'Túi' },
  { code: 'NL014', name: 'Thạch Dừa 3kg', categoryCode: 'NL', sellingPrice: 110000, costPrice: 80000, stock: 100, minStock: 20, unit: 'Hộp' },
  { code: 'NL015', name: 'Kem Tươi Whipping 1L', categoryCode: 'NL', sellingPrice: 125000, costPrice: 92000, stock: 150, minStock: 30, unit: 'Hộp' },

  // NL ĐỘC QUYỀN
  { code: 'NLDQ001', name: 'Siro Đào Phúc Tea 1L', categoryCode: 'NLDQ', sellingPrice: 185000, costPrice: 135000, stock: 80, minStock: 15, unit: 'Chai' },
  { code: 'NLDQ002', name: 'Siro Vải Phúc Tea 1L', categoryCode: 'NLDQ', sellingPrice: 185000, costPrice: 135000, stock: 75, minStock: 15, unit: 'Chai' },
  { code: 'NLDQ003', name: 'Siro Lychee Phúc Tea 1L', categoryCode: 'NLDQ', sellingPrice: 190000, costPrice: 140000, stock: 60, minStock: 10, unit: 'Chai' },
  { code: 'NLDQ004', name: 'Siro Dâu Phúc Tea 1L', categoryCode: 'NLDQ', sellingPrice: 180000, costPrice: 130000, stock: 90, minStock: 18, unit: 'Chai' },
  { code: 'NLDQ005', name: 'Siro Chanh Leo Phúc Tea 1L', categoryCode: 'NLDQ', sellingPrice: 195000, costPrice: 145000, stock: 55, minStock: 10, unit: 'Chai' },
  { code: 'NLDQ006', name: 'Bột Trà Sữa Phúc Tea 1kg', categoryCode: 'NLDQ', sellingPrice: 420000, costPrice: 310000, stock: 40, minStock: 8, unit: 'Túi' },
  { code: 'NLDQ007', name: 'Topping Phô Mai Phúc Tea 1kg', categoryCode: 'NLDQ', sellingPrice: 280000, costPrice: 205000, stock: 50, minStock: 10, unit: 'Hộp' },
  { code: 'NLDQ008', name: 'Bột Pudding Phúc Tea 1kg', categoryCode: 'NLDQ', sellingPrice: 195000, costPrice: 142000, stock: 70, minStock: 15, unit: 'Túi' },
  { code: 'NLDQ009', name: 'Hương Liệu Trà Phúc Tea 500ml', categoryCode: 'NLDQ', sellingPrice: 350000, costPrice: 260000, stock: 30, minStock: 5, unit: 'Chai' },
  { code: 'NLDQ010', name: 'Kem Muối Phúc Tea 1kg', categoryCode: 'NLDQ', sellingPrice: 265000, costPrice: 195000, stock: 45, minStock: 8, unit: 'Hộp' },

  // HỆ THỐNG
  { code: 'HT001', name: 'Máy Ép Trà Phúc Tea Pro', categoryCode: 'HT', sellingPrice: 12500000, costPrice: 9800000, stock: 5, minStock: 1, unit: 'Cái' },
  { code: 'HT002', name: 'Máy Seal Ly Tự Động', categoryCode: 'HT', sellingPrice: 8900000, costPrice: 7200000, stock: 8, minStock: 2, unit: 'Cái' },
  { code: 'HT003', name: 'Bình Đun Nước Điện 5L', categoryCode: 'HT', sellingPrice: 1850000, costPrice: 1450000, stock: 20, minStock: 3, unit: 'Cái' },
  { code: 'HT004', name: 'Tủ Lạnh Mini Phúc Tea', categoryCode: 'HT', sellingPrice: 5500000, costPrice: 4300000, stock: 3, minStock: 1, unit: 'Cái' },
  { code: 'HT005', name: 'Máy Xay Sinh Tố Công Nghiệp', categoryCode: 'HT', sellingPrice: 3200000, costPrice: 2500000, stock: 10, minStock: 2, unit: 'Cái' },
  { code: 'HT006', name: 'Cân Điện Tử 5kg', categoryCode: 'HT', sellingPrice: 680000, costPrice: 520000, stock: 15, minStock: 3, unit: 'Cái' },
  { code: 'HT007', name: 'Máy POS Phúc Tea Bundle', categoryCode: 'HT', sellingPrice: 32800000, costPrice: 28000000, stock: 2, minStock: 1, unit: 'Bộ' },
  { code: 'HT008', name: 'Bảng Hiệu LED Phúc Tea 1.2m', categoryCode: 'HT', sellingPrice: 4500000, costPrice: 3600000, stock: 6, minStock: 1, unit: 'Cái' },
  { code: 'HT009', name: 'Kệ Trưng Bày Phúc Tea', categoryCode: 'HT', sellingPrice: 2800000, costPrice: 2200000, stock: 4, minStock: 1, unit: 'Cái' },
  { code: 'HT010', name: 'Thùng Đá Inox 50L', categoryCode: 'HT', sellingPrice: 1650000, costPrice: 1280000, stock: 12, minStock: 2, unit: 'Cái' },

  // DECOR
  { code: 'DC001', name: 'Tranh Canvas Phúc Tea A2', categoryCode: 'DC', sellingPrice: 450000, costPrice: 340000, stock: 25, minStock: 5, unit: 'Bộ' },
  { code: 'DC002', name: 'Đèn Neon Phúc Tea', categoryCode: 'DC', sellingPrice: 1200000, costPrice: 920000, stock: 8, minStock: 2, unit: 'Cái' },
  { code: 'DC003', name: 'Menu Stand Mica A4', categoryCode: 'DC', sellingPrice: 180000, costPrice: 130000, stock: 40, minStock: 8, unit: 'Cái' },

  // HÀNG THANH LÝ
  { code: 'HTL001', name: 'Ly Nhựa Cũ 500ml (Lỗi In)', categoryCode: 'HTL', sellingPrice: 1500, costPrice: 500, stock: 500, minStock: 0, unit: 'Cái' },
  { code: 'HTL002', name: 'Ống Hút Giấy Hư (Lô Cũ)', categoryCode: 'HTL', sellingPrice: 500, costPrice: 200, stock: 1000, minStock: 0, unit: 'Cái' },
  { code: 'HTL003', name: 'Áo Thun Lỗi Size 2023', categoryCode: 'HTL', sellingPrice: 80000, costPrice: 35000, stock: 20, minStock: 0, unit: 'Cái' },
  { code: 'HTL004', name: 'Decal Cũ 2022 (Còn Tồn)', categoryCode: 'HTL', sellingPrice: 5000, costPrice: 2000, stock: 200, minStock: 0, unit: 'Tờ' },
  { code: 'HTL005', name: 'Trà Hết Date (Thanh Lý)', categoryCode: 'HTL', sellingPrice: 50000, costPrice: 20000, stock: 30, minStock: 0, unit: 'Gói' },
];

// ============================================================
// SEED FUNCTION
// ============================================================
async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Đã xóa dữ liệu cũ');

  // Hash password helper
  const hashPassword = async (pwd: string) => bcrypt.hash(pwd, 10);

  // ── 1. Create Admin ──────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@phuctea.vn',
      password: await hashPassword('Admin@123456'),
      fullName: 'Quản Trị Viên',
      phone: '0900000001',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Tạo admin: ${admin.email}`);

  // ── 2. Create Warehouse Staff ────────────────────────────
  const warehouse = await prisma.user.create({
    data: {
      email: 'warehouse@phuctea.vn',
      password: await hashPassword('Warehouse@123456'),
      fullName: 'Nhân Viên Kho',
      phone: '0900000002',
      role: 'WAREHOUSE_STAFF',
    },
  });
  console.log(`✅ Tạo kho: ${warehouse.email}`);

  // ── 3. Create Accountant ─────────────────────────────────
  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@phuctea.vn',
      password: await hashPassword('Accountant@123456'),
      fullName: 'Kế Toán Viên',
      phone: '0900000003',
      role: 'ACCOUNTANT',
    },
  });
  console.log(`✅ Tạo kế toán: ${accountant.email}`);

  // ── 4. Create Store Owners ───────────────────────────────
  const ownerNames = [...new Set(storesData.map((s) => s.ownerName))];
  const ownerMap = new Map<string, any>();

  for (const name of ownerNames) {
    const normalizedName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/, '');

    const email = `${normalizedName}@phuctea.vn`;
    const phone = storesData.find((s) => s.ownerName === name)?.phone || '';

    const owner = await prisma.user.create({
      data: {
        email,
        password: await hashPassword('Owner@123456'),
        fullName: name,
        phone,
        role: 'STORE_OWNER',
      },
    });
    ownerMap.set(name, owner);
  }
  console.log(`✅ Tạo ${ownerMap.size} chủ cửa hàng`);

  // ── 5. Create Stores ─────────────────────────────────────
  for (const storeInfo of storesData) {
    const owner = ownerMap.get(storeInfo.ownerName);
    await prisma.store.create({
      data: {
        code: storeInfo.code,
        name: storeInfo.name,
        phone: storeInfo.phone,
        ownerId: owner.id,
      },
    });
  }
  console.log(`✅ Tạo ${storesData.length} cửa hàng`);

  // ── 6. Create Product Categories ─────────────────────────
  const categoryMap = new Map<string, any>();
  for (const cat of categoriesData) {
    const category = await prisma.productCategory.create({ data: cat });
    categoryMap.set(cat.code, category);
  }
  console.log(`✅ Tạo ${categoriesData.length} nhóm hàng`);

  // ── 7. Create Products ───────────────────────────────────
  for (const prod of productsData) {
    const category = categoryMap.get(prod.categoryCode);
    if (!category) {
      console.warn(`⚠️  Không tìm thấy nhóm hàng: ${prod.categoryCode}`);
      continue;
    }
    await prisma.product.create({
      data: {
        code: prod.code,
        name: prod.name,
        sellingPrice: prod.sellingPrice,
        costPrice: prod.costPrice,
        stock: prod.stock,
        minStock: prod.minStock,
        unit: prod.unit,
        categoryId: category.id,
      },
    });
  }
  console.log(`✅ Tạo ${productsData.length} sản phẩm`);

  // ── 8. Create Sample Orders ──────────────────────────────
  const stores = await prisma.store.findMany({ take: 5 });
  const products = await prisma.product.findMany({ take: 10 });

  const sampleStatuses = ['COMPLETED', 'SHIPPING', 'APPROVED', 'DRAFT', 'COMPLETED'];

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    const status = sampleStatuses[i] as any;
    const orderProducts = products.slice(i % 3, (i % 3) + 3);

    let totalAmount = 0;
    const itemsData = orderProducts.map((p) => {
      const qty = Math.floor(Math.random() * 5) + 1;
      const total = p.sellingPrice * qty;
      totalAmount += total;
      return {
        productId: p.id,
        quantity: qty,
        unitPrice: p.sellingPrice,
        totalPrice: total,
      };
    });

    const dateOffset = (stores.length - i) * 2;
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - dateOffset);

    const orderNumber = `DH${createdDate.toISOString().slice(0, 10).replace(/-/g, '')}${String(i + 1).padStart(4, '0')}`;

    const orderData: any = {
      orderNumber,
      storeId: store.id,
      createdById: admin.id,
      totalAmount,
      status,
      note: `Đơn hàng mẫu số ${i + 1}`,
      createdAt: createdDate,
      items: { create: itemsData },
    };

    if (['APPROVED', 'SHIPPING', 'COMPLETED'].includes(status)) {
      orderData.approvedAt = new Date(createdDate.getTime() + 3600000);
    }
    if (['SHIPPING', 'COMPLETED'].includes(status)) {
      orderData.shippedAt = new Date(createdDate.getTime() + 86400000);
    }
    if (status === 'COMPLETED') {
      orderData.completedAt = new Date(createdDate.getTime() + 172800000);
    }

    const order = await prisma.order.create({ data: orderData });

    // Create payment for completed orders
    if (status === 'COMPLETED') {
      const isPaid = i % 2 === 0;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          totalAmount,
          paidAmount: isPaid ? totalAmount : 0,
          remainingAmount: isPaid ? 0 : totalAmount,
          isPaid,
          paymentMethod: isPaid ? 'CASH' : null,
          paymentDate: isPaid ? new Date() : null,
        },
      });
    }
  }

  console.log('✅ Tạo dữ liệu đơn hàng mẫu');

  console.log('\n🎉 Seed dữ liệu hoàn tất!');
  console.log('\n📋 Tài khoản đăng nhập:');
  console.log('  Admin:     admin@phuctea.vn       / Admin@123456');
  console.log('  Kho:       warehouse@phuctea.vn   / Warehouse@123456');
  console.log('  Kế toán:   accountant@phuctea.vn  / Accountant@123456');
  console.log('  Chủ CH:    (tên chủ)@phuctea.vn   / Owner@123456');
  console.log('\n  Ví dụ chủ CH: cao.thi.diem.tram@phuctea.vn');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
