import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [
      totalStores,
      totalProducts,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue,
      totalDebt,
    ] = await Promise.all([
      this.prisma.store.count({ where: { isActive: true } }),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { status: 'DRAFT' } }),
      this.prisma.payment.aggregate({
        where: { isPaid: true },
        _sum: { paidAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: { isPaid: false },
        _sum: { remainingAmount: true },
      }),
    ]);

    return {
      totalStores,
      totalProducts,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: totalRevenue._sum.paidAmount || 0,
      totalDebt: totalDebt._sum.remainingAmount || 0,
    };
  }

  async getRevenue(dateFrom?: string, dateTo?: string) {
    const where: any = { status: 'COMPLETED' };
    if (dateFrom || dateTo) {
      where.completedAt = {};
      if (dateFrom) where.completedAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.completedAt.lte = end;
      }
    }

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        totalAmount: true,
        completedAt: true,
        store: { select: { name: true, code: true } },
      },
      orderBy: { completedAt: 'asc' },
    });

    return orders;
  }

  async getTopStores() {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { orders: true } },
        orders: {
          where: { status: 'COMPLETED' },
          select: { totalAmount: true },
        },
      },
      orderBy: { orders: { _count: 'desc' } },
      take: 10,
    });

    return stores.map((store) => ({
      ...store,
      totalRevenue: store.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    }));
  }

  async getTopProducts() {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, code: true, name: true, unit: true, sellingPrice: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return items.map((item) => ({
      product: productMap.get(item.productId),
      totalQuantity: item._sum.quantity,
      totalRevenue: item._sum.totalPrice,
      orderCount: item._count,
    }));
  }
}
