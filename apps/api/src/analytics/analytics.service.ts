import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';

interface AnalyticsQuery {
  restaurantId: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Limite máximo de janela para queries de série temporal (analytics).
 * Evita que um cliente peça "todos os pedidos desde 2020" e trave o banco.
 */
export const ANALYTICS_MAX_DAYS = 90;

/**
 * Service de analytics com queries parametrizadas.
 *
 * Segurança:
 * - Todos os `$queryRaw` usam `Prisma.sql` template (parametrização nativa).
 * - Datas são validadas (Date.parse) antes de chegar ao SQL.
 * - `restaurantId` é incluído como parâmetro, não concatenado.
 */
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Converte uma string de data para `Date` válida, ou retorna `undefined`.
   * Lança `BadRequestException` se a string for malformada.
   */
  private parseDate(value: string | undefined, field: string): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestException(`Data inválida em '${field}': ${value}`);
    }
    return parsed;
  }

  async getOverview(query: AnalyticsQuery) {
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');

    const where: Prisma.OrderWhereInput = {
      restaurantId: query.restaurantId,
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
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
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');

    // ⚠️ Construção SEGURA via Prisma.sql — todas as variáveis são parâmetros,
    // nunca concatenadas como string.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`o.restaurant_id = ${query.restaurantId}`,
      Prisma.sql`o.status = 'paid'`,
      Prisma.sql`oi.product_id IS NOT NULL`,
    ];

    if (startDate) {
      conditions.push(Prisma.sql`o.created_at >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(Prisma.sql`o.created_at <= ${endDate}`);
    }

    const items = await this.prisma.$queryRaw<
      Array<{ product_id: string; product_name: string; total_quantity: bigint }>
    >(Prisma.sql`
      SELECT
        oi.product_id,
        p.name as product_name,
        SUM(oi.quantity)::bigint as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY oi.product_id, p.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `);

    return items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: Number(item.total_quantity),
    }));
  }

  async getOrdersByStatus(query: AnalyticsQuery) {
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');

    const orders = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        restaurantId: query.restaurantId,
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      _count: true,
    });

    return orders.map((o) => ({ status: o.status, count: o._count }));
  }

  async getOverviewDetailed(query: AnalyticsQuery) {
    const startDate = this.parseDate(query.startDate, 'startDate');
    const endDate = this.parseDate(query.endDate, 'endDate');

    const where: Prisma.OrderWhereInput = {
      restaurantId: query.restaurantId,
      status: { not: 'cancelled' },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
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
    // Cap de janela (auditoria A9): nunca mais que ANALYTICS_MAX_DAYS dias.
    const now = new Date();
    const defaultSince = new Date(now);
    defaultSince.setDate(defaultSince.getDate() - 30);

    let since: Date;
    if (query.startDate) {
      since = new Date(query.startDate);
    } else {
      since = defaultSince;
    }
    // Auditoria ACHADO-27 (Re-varredura 6): o cap de janela SÓ era aplicado
    // quando `endDate` era fornecido. Se o cliente omitir `endDate` mas
    // fornecer `startDate` muito no passado (ex: 10 anos atrás), a janela
    // ficava ILIMITADA — a query varria toda a tabela orders agrupando por
    // DATE(created_at), criando milhões de buckets e degradando o DB.
    // Agora: `until` é sempre definido (agora se endDate ausente) e o cap
    // é checado incondicionalmente.
    const until = query.endDate ? new Date(query.endDate) : new Date(now);
    const windowDays = Math.ceil((until.getTime() - since.getTime()) / 86_400_000);
    if (windowDays > ANALYTICS_MAX_DAYS) {
      throw new BadRequestException(
        `Janela máxima de analytics é ${ANALYTICS_MAX_DAYS} dias (solicitado: ${windowDays})`
      );
    }

    // Construção segura com parâmetros.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`restaurant_id = ${query.restaurantId}`,
      Prisma.sql`status != 'cancelled'`,
      Prisma.sql`created_at >= ${since}`,
    ];

    const orders = await this.prisma.$queryRaw<
      Array<{ date: Date; orders: bigint; revenue: number }>
    >(Prisma.sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total)::float as revenue
      FROM orders
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    return orders.map((o) => ({
      date: o.date,
      orders: Number(o.orders),
      revenue: o.revenue,
    }));
  }
}
