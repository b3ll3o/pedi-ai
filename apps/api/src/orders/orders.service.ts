import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private readonly realtimeService: RealtimeService
  ) {}

  async findByRestaurant(restaurantId: string) {
    return this.prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return order;
  }

  async findByCustomer(customerId: string, restaurantId: string) {
    return this.prisma.order.findMany({
      where: { customerId, restaurantId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async create(data: {
    restaurantId: string;
    tableId?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    customerEmail?: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: PaymentMethod;
    idempotencyKey?: string;
    items: Array<{
      productId: string;
      comboId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes?: string;
    }>;
  }) {
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          restaurantId: data.restaurantId,
          tableId: data.tableId,
          customerId: data.customerId,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          subtotal: data.subtotal,
          tax: data.tax,
          total: data.total,
          paymentMethod: data.paymentMethod,
          idempotencyKey: data.idempotencyKey,
          items: {
            create: data.items,
          },
        },
        include: { items: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: newOrder.status,
          notes: 'Pedido criado',
        },
      });

      return newOrder;
    });

    this.realtimeService.emitNewOrder(data.restaurantId, {
      id: order.id,
      total: order.total,
    });

    return order;
  }

  async updateStatus(id: string, status: OrderStatus, notes?: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: id, status, notes },
      });

      return updatedOrder;
    });

    this.realtimeService.emitOrderUpdate(order.restaurantId, {
      id: order.id,
      status: order.status,
    });

    return order;
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus },
    });
  }
}
