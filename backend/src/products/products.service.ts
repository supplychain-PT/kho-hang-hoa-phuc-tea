import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto, ProductQueryDto, CreateCategoryDto } from './dto/product.dto';
;

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto, currentUser: any) {
    const { page = 1, limit = 50, search, categoryId, isActive } = query;
    const skip = (page - 1) * Number(limit);
    const isStoreOwner = currentUser.role === 'STORE_OWNER';

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === true || isActive === 'true' as any;
    else where.isActive = true;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { code: 'asc' },
        ],
        include: {
          category: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Hide costPrice for STORE_OWNER
    const data = products.map((p) => {
      if (isStoreOwner) {
        const { costPrice, ...rest } = p;
        return { ...rest, costPrice: null };
      }
      return p;
    });

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    if (currentUser.role === 'STORE_OWNER') {
      const { costPrice, ...rest } = product;
      return { ...rest, costPrice: null };
    }

    return product;
  }

  async create(createProductDto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { code: createProductDto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã sản phẩm ${createProductDto.code} đã tồn tại`);
    }

    return this.prisma.product.create({
      data: createProductDto,
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findAllCategories() {
    return this.prisma.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.productCategory.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new ConflictException(`Mã nhóm hàng ${dto.code} đã tồn tại`);

    return this.prisma.productCategory.create({ data: dto });
  }

  async getStockMovements(productId: string, currentUser: any) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    // ── Lấy đơn cửa hàng đã duyệt (xuất bán) ───────────────────────────
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId,
        order: { status: { in: ['APPROVED', 'SHIPPING', 'COMPLETED'] } },
      },
      include: {
        order: {
          include: { store: { select: { name: true, code: true } } },
        },
      },
      orderBy: { order: { approvedAt: 'desc' } },
    });

    // ── Lấy phiếu nhập kho (nếu có model PurchaseReceiptItem sau này) ──
    // Hiện tại chưa có model nhập hàng → bỏ qua

    // ── Gộp & sắp xếp theo thời gian mới nhất trước ─────────────────────
    type Movement = {
      id: string;
      chungTu: string;
      thoiGian: Date;
      loaiGiaoDich: string;
      doiTac: string;
      giaGD: number;
      giaVon: number;
      soLuong: number;
      tonCuoi: number;
    };

    const rawSales: Movement[] = orderItems.map((item) => ({
      id: item.id,
      chungTu: item.order.invoiceNumber || item.order.orderNumber,
      thoiGian: (item.order.approvedAt || item.order.createdAt) as Date,
      loaiGiaoDich: 'Xuất bán',
      doiTac: item.order.store
        ? `${item.order.store.code} – ${item.order.store.name}`
        : '',
      giaGD: item.unitPrice,
      giaVon: product.costPrice,
      soLuong: -item.quantity,   // âm = xuất
      tonCuoi: 0,                // tính lại bên dưới
    }));

    // Sắp xếp cũ → mới để tính tồn cuối tích lũy
    rawSales.sort((a, b) => new Date(a.thoiGian).getTime() - new Date(b.thoiGian).getTime());

    // Tính tồn cuối ngược từ tồn hiện tại (đi từ mới → cũ)
    let runningStock = product.stock;
    const movements: Movement[] = [];
    for (let i = rawSales.length - 1; i >= 0; i--) {
      const m = rawSales[i];
      m.tonCuoi = runningStock;
      runningStock -= m.soLuong; // soLuong âm → cộng lại
      movements.unshift(m);
    }

    // Trả về mới nhất trước
    movements.reverse();

    return { product, movements };
  }
}
