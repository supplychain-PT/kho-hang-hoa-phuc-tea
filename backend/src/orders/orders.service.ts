import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto, ProcessOrderDto } from './dto/order.dto';
import { OrderStatus, Role } from '../common/constants/enums';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    return `DH${String(count + 1).padStart(6, '0')}`;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.prisma.order.count({
      where: { invoiceNumber: { not: null } },
    });
    return `HD${String(count + 1).padStart(6, '0')}`;
  }

  async findAll(query: OrderQueryDto, currentUser: any) {
    const { page = 1, limit = 20, status, statusIn, storeId, dateFrom, dateTo, search } = query;
    const skip = (page - 1) * Number(limit);

    const where: any = {};

    // STORE_OWNER only sees their stores' orders
    if (currentUser.role === 'STORE_OWNER') {
      const userStoreIds = currentUser.stores.map((s: any) => s.id);
      where.storeId = { in: userStoreIds };
    } else if (storeId) {
      where.storeId = storeId;
    }

    if (status) {
      where.status = status;
    } else if (statusIn) {
      where.status = { in: statusIn.split(',').map((s) => s.trim()) };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { store: { name: { contains: search, mode: 'insensitive' } } },
        { store: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          payment: { select: { isPaid: true, paidAmount: true, remainingAmount: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
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

  async exportOrders(query: OrderQueryDto, currentUser: any) {
    const { status, statusIn, storeId, dateFrom, dateTo, search } = query;
    const where: any = {};

    if (status) {
      where.status = status;
    } else if (statusIn) {
      where.status = { in: statusIn.split(',').map((s) => s.trim()) };
    }
    if (storeId) where.storeId = storeId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { store: { name: { contains: search, mode: 'insensitive' } } },
        { store: { code: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      take: 5000,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { code: true, name: true } },
        createdBy: { select: { fullName: true } },
        payment: { select: { isPaid: true, paidAmount: true, remainingAmount: true } },
        items: {
          include: {
            product: { select: { code: true, name: true, unit: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return orders;
  }

  async findOne(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        store: {
          include: {
            owner: { select: { id: true, fullName: true, phone: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (currentUser.role === 'STORE_OWNER') {
      const userStoreIds = currentUser.stores.map((s: any) => s.id);
      if (!userStoreIds.includes(order.storeId)) {
        throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
      }
    }

    return order;
  }

  async create(createOrderDto: CreateOrderDto, currentUser: any) {
    const { storeId, items, note } = createOrderDto;

    // Verify store access
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');

    if (currentUser.role === 'STORE_OWNER') {
      if (store.ownerId !== currentUser.id) {
        throw new ForbiddenException('Bạn không có quyền đặt hàng cho cửa hàng này');
      }
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // Get products and calculate prices
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Một số sản phẩm không tồn tại hoặc đã ngừng bán');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      const unitPrice = product.sellingPrice;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        storeId,
        createdById: currentUser.id,
        totalAmount,
        note,
        status: 'DRAFT',
        items: { create: orderItems },
      },
      include: {
        store: { select: { id: true, code: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
          },
        },
      },
    });

    return order;
  }

  async processOrder(id: string, dto: ProcessOrderDto, currentUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ có thể xử lý đơn hàng ở trạng thái PHIẾU TẠM');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // Validate & price products
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Một số sản phẩm không hợp lệ');
    }
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;
    const newItems = dto.items.map((item, idx) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = product.sellingPrice;
      const itemDiscount = item.discount || 0;
      const totalPrice = Math.max(0, unitPrice * item.quantity - itemDiscount);
      subtotal += totalPrice;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        totalPrice,
        sortOrder: item.sortOrder ?? idx,
      };
    });
    const totalDiscount = dto.totalDiscount || 0;
    const totalAmount = Math.max(0, subtotal - totalDiscount);

    // Transaction: delete old items, create new items, approve, create payment
    await this.prisma.$transaction(async (tx) => {
      // Replace items
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.orderItem.createMany({ data: newItems.map((i) => ({ ...i, orderId: id })) });

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Update order
      await tx.order.update({
        where: { id },
        data: {
          totalAmount,
          discount: totalDiscount,
          note: dto.note,
          status: 'COMPLETED',
          completedAt: new Date(),
          invoiceNumber,
        },
      });

      // Create payment record
      await tx.payment.upsert({
        where: { orderId: id },
        create: {
          orderId: id,
          totalAmount,
          paidAmount: dto.payNow ? totalAmount : 0,
          remainingAmount: dto.payNow ? 0 : totalAmount,
          isPaid: dto.payNow,
          paymentMethod: dto.payNow ? (dto.paymentMethod || 'CASH') : null,
          paymentDate: dto.payNow ? new Date() : null,
        },
        update: {
          totalAmount,
          paidAmount: dto.payNow ? totalAmount : 0,
          remainingAmount: dto.payNow ? 0 : totalAmount,
          isPaid: dto.payNow,
          paymentMethod: dto.payNow ? (dto.paymentMethod || 'CASH') : null,
          paymentDate: dto.payNow ? new Date() : null,
        },
      });
    });

    return this.findOne(id, currentUser);
  }

  async approve(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'DRAFT') {
      throw new BadRequestException(`Chỉ có thể duyệt đơn hàng ở trạng thái PHIẾU TẠM. Trạng thái hiện tại: ${order.status}`);
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        invoiceNumber,
      },
      include: {
        store: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async ship(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'APPROVED') {
      throw new BadRequestException('Chỉ có thể giao đơn hàng đã được duyệt');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'SHIPPING',
        shippedAt: new Date(),
      },
    });
  }

  async complete(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'SHIPPING') {
      throw new BadRequestException('Chỉ có thể hoàn thành đơn hàng đang giao');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Auto create payment record if not exists
    if (!order.payment) {
      await this.prisma.payment.create({
        data: {
          orderId: id,
          totalAmount: order.totalAmount,
          paidAmount: 0,
          remainingAmount: order.totalAmount,
          isPaid: false,
        },
      });
    }

    return updatedOrder;
  }

  async cancel(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng ở trạng thái PHIẾU TẠM');
    }

    if (currentUser.role === 'STORE_OWNER' && order.createdById !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async deleteOrder(id: string, currentUser: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    // DRAFT không ảnh hưởng tồn kho; COMPLETED thì hoàn kho
    const needRestoreStock = order.status === 'COMPLETED';

    await this.prisma.$transaction(async (tx) => {
      // Hoàn lại tồn kho nếu đơn đã ảnh hưởng tồn kho
      if (needRestoreStock) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Xóa payment, items, order
      await tx.payment.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    return { message: `Đã xóa đơn hàng ${order.orderNumber} và hoàn lại tồn kho` };
  }

  async getDashboardStats(currentUser: any) {
    const where: any = {};
    if (currentUser.role === 'STORE_OWNER') {
      const storeIds = currentUser.stores.map((s: any) => s.id);
      where.storeId = { in: storeIds };
    }

    const [total, pending, shipping, completed, totalDebt] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.order.count({ where: { ...where, status: 'SHIPPING' } }),
      this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({
        where: { isPaid: false, order: where.storeId ? { storeId: where.storeId } : {} },
        _sum: { remainingAmount: true },
      }),
    ]);

    const recentOrders = await this.prisma.order.findMany({
      where,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { id: true, code: true, name: true } },
        payment: { select: { isPaid: true, remainingAmount: true } },
      },
    });

    return {
      stats: {
        total,
        pending,
        shipping,
        completed,
        totalDebt: totalDebt._sum.remainingAmount || 0,
      },
      recentOrders,
    };
  }
}
