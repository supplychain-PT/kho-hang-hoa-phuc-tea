import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchaseReceiptsService {
  constructor(private prisma: PrismaService) {}

  private async generateReceiptNumber(): Promise<string> {
    const count = await this.prisma.purchaseReceipt.count();
    return `NK${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, search, status, dateFrom, dateTo } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status) where.status = status;
    if (search) where.receiptNumber = { contains: search };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const e = new Date(dateTo);
        e.setHours(23, 59, 59, 999);
        where.createdAt.lte = e;
      }
    }
    const [data, total] = await Promise.all([
      this.prisma.purchaseReceipt.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseReceipt.count({ where }),
    ]);
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

  async findOne(id: string) {
    const receipt = await this.prisma.purchaseReceipt.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: {
              select: { id: true, code: true, name: true, unit: true, stock: true },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập');
    return receipt;
  }

  async create(
    dto: {
      note?: string;
      items: Array<{ productId: string; quantity: number; costPrice: number }>;
    },
    currentUser: any,
  ) {
    if (!dto.items || dto.items.length === 0)
      throw new BadRequestException('Phiếu nhập phải có ít nhất 1 sản phẩm');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== productIds.length)
      throw new BadRequestException('Một số sản phẩm không tồn tại');

    let totalAmount = 0;
    const receiptItems = dto.items.map((item) => {
      const totalPrice = item.quantity * item.costPrice;
      totalAmount += totalPrice;
      return {
        productId: item.productId,
        quantity: item.quantity,
        costPrice: item.costPrice,
        totalPrice,
      };
    });

    const receiptNumber = await this.generateReceiptNumber();
    return this.prisma.purchaseReceipt.create({
      data: {
        receiptNumber,
        note: dto.note,
        totalAmount,
        createdById: currentUser.id,
        items: { create: receiptItems },
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
          },
        },
      },
    });
  }

  async complete(id: string) {
    const receipt = await this.prisma.purchaseReceipt.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (receipt.status !== 'DRAFT')
      throw new BadRequestException('Phiếu nhập đã được duyệt');

    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity }, costPrice: item.costPrice },
        });
      }
      await tx.purchaseReceipt.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const receipt = await this.prisma.purchaseReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException('Không tìm thấy phiếu nhập');
    if (receipt.status === 'COMPLETED')
      throw new BadRequestException('Không thể xóa phiếu nhập đã duyệt');
    await this.prisma.$transaction([
      this.prisma.purchaseReceiptItem.deleteMany({ where: { receiptId: id } }),
      this.prisma.purchaseReceipt.delete({ where: { id } }),
    ]);
    return { message: 'Đã xóa phiếu nhập' };
  }
}
