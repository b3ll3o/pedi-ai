import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

interface AnalyticsQuery {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(query: AnalyticsQuery) {
    const where = {
      restaurantId: query.restaurantId,
      createdAt: {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      },
    };

    const [orders, revenue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { total: true },
      }),
    ]);

    return { orders, revenue: revenue._sum.total ?? 0 };
  }

  async getPopularItems(query: AnalyticsQuery) {
    const where = {
      order: {
        restaurantId: query.restaurantId,
        status: 'paid',
        ...(query.startDate && { createdAt: { gte: new Date(query.startDate) } }),
        ...(query.endDate && { createdAt: { lte: new Date(query.endDate) } }),
      },
    };

    // Use raw query to avoid complex Prisma type issues
    const items = await this.prisma.$queryRaw<
      Array<{ product_id: string; product_name: string; total_quantity: bigint }>
    >`
      SELECT
        oi.product_id,
        p.name as product_name,
        SUM(oi.quantity)::bigint as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.restaurant_id = ${query.restaurantId}
        AND o.status = 'paid'
        AND oi.product_id IS NOT NULL
        ${query.startDate ? `AND o.created_at >= ${new Date(query.startDate)}` : ''}
        ${query.endDate ? `AND o.created_at <= ${new Date(query.endDate)}` : ''}
      GROUP BY oi.product_id, p.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    return items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: Number(item.total_quantity),
    }));
  }

  async getOrdersByStatus(query: AnalyticsQuery) {
    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        restaurantId: query.restaurantId,
        ...(query.startDate && { createdAt: { gte: new Date(query.startDate) } }),
        ...(query.endDate && { createdAt: { lte: new Date(query.endDate) } }),
      },
      _count: true,
    });

    return orders.map((o) => ({ status: o.status, count: o._count }));
  }

  async getOverviewDetailed(query: AnalyticsQuery) {
    const where = {
      restaurantId: query.restaurantId,
      status: { not: 'cancelled' as const },
      ...(query.startDate && { createdAt: { gte: new Date(query.startDate) } }),
      ...(query.endDate && { createdAt: { lte: new Date(query.endDate) } }),
    };

    const [orders, revenue, avgOrderValue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { ...where },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where },
        _avg: { total: true },
      }),
    ]);

    return {
      total_orders: orders,
      total_revenue: revenue._sum.total ?? 0,
      avg_order_value: avgOrderValue._avg.total ?? 0,
    };
  }

  async getDailyOrders(query: AnalyticsQuery) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.$queryRaw<
      Array<{ date: Date; orders: bigint; revenue: number }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total)::float as revenue
      FROM orders
      WHERE restaurant_id = ${query.restaurantId}
        AND status != 'cancelled'
        AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return orders.map((o) => ({
      date: o.date,
      orders: Number(o.orders),
      revenue: o.revenue,
    }));
  }
}
