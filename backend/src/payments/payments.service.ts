import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto, PaymentQueryDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PaymentQueryDto) {
    const { page = 1, limit = 20, isPaid, storeId, dateFrom, dateTo } = query;
    const skip = (page - 1) * Number(limit);

    const where: any = {};
    if (isPaid !== undefined) where.isPaid = isPaid === true || isPaid === 'true' as any;
    if (storeId) where.order = { storeId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              store: {
                include: {
                  owner: { select: { id: true, fullName: true, phone: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
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

  async getDebts(query: PaymentQueryDto) {
    const { page = 1, limit = 20, storeId } = query;
    const skip = (page - 1) * Number(limit);

    const where: any = { isPaid: false };
    if (storeId) where.order = { storeId };

    const [data, total, summary] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'asc' },
        include: {
          order: {
            include: {
              store: {
                include: {
                  owner: { select: { id: true, fullName: true, phone: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where,
        _sum: { remainingAmount: true, totalAmount: true, paidAmount: true },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
      summary: {
        totalDebt: summary._sum.remainingAmount || 0,
        totalAmount: summary._sum.totalAmount || 0,
        totalPaid: summary._sum.paidAmount || 0,
      },
    };
  }

  async getDebtByOwner() {
    const payments = await this.prisma.payment.findMany({
      where: { isPaid: false },
      include: {
        order: {
          include: {
            store: {
              include: {
                owner: { select: { id: true, fullName: true, phone: true, email: true } },
              },
            },
          },
        },
      },
    });

    // Group by owner
    const ownerMap = new Map<string, any>();
    for (const payment of payments) {
      const owner = payment.order.store.owner;
      if (!ownerMap.has(owner.id)) {
        ownerMap.set(owner.id, {
          owner,
          totalDebt: 0,
          orderCount: 0,
          orders: [],
        });
      }
      const entry = ownerMap.get(owner.id);
      entry.totalDebt += payment.remainingAmount;
      entry.orderCount += 1;
      entry.orders.push({
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        storeName: payment.order.store.name,
        totalAmount: payment.totalAmount,
        paidAmount: payment.paidAmount,
        remainingAmount: payment.remainingAmount,
      });
    }

    return Array.from(ownerMap.values()).sort((a, b) => b.totalDebt - a.totalDebt);
  }

  async recordPayment(orderId: string, dto: RecordPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) throw new NotFoundException('Không tìm thấy thông tin thanh toán cho đơn hàng này');
    if (payment.isPaid) throw new BadRequestException('Đơn hàng này đã thanh toán đầy đủ');

    if (dto.paidAmount > payment.remainingAmount) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.paidAmount}) vượt quá số tiền còn lại (${payment.remainingAmount})`,
      );
    }

    const newPaidAmount = payment.paidAmount + dto.paidAmount;
    const newRemainingAmount = payment.totalAmount - newPaidAmount;
    const isPaid = newRemainingAmount <= 0;

    return this.prisma.payment.update({
      where: { orderId },
      data: {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        isPaid,
        paymentMethod: dto.paymentMethod,
        paymentDate: new Date(),
        note: dto.note,
      },
      include: {
        order: {
          include: {
            store: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            store: {
              include: {
                owner: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new NotFoundException('Không tìm thấy thông tin thanh toán');
    return payment;
  }
}
