import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

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

  async create(data: {
    restaurantId: string;
    tableId?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
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
    return this.prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        tableId: data.tableId,
        customerId: data.customerId,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
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
  }

  async updateStatus(id: string, status: OrderStatus, notes?: string) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
    });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    await this.prisma.orderStatusHistory.create({
      data: { orderId: id, status, notes },
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
