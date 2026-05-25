import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPixPayment(data: { orderId: string; restaurantId: string; amount: number }) {
    const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const payment = await this.prisma.paymentIntent.create({
      data: {
        orderId: data.orderId,
        restaurantId: data.restaurantId,
        amount: data.amount,
        paymentMethod: 'pix',
        status: 'pending',
        expiresAt,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=pix-${data.orderId}`,
      },
    });

    return {
      id: payment.id,
      qrCode: payment.qrCode,
      expiresAt: payment.expiresAt,
      amount: payment.amount,
    };
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
    };
  }

  async getPaymentStatusByOrder(orderId: string) {
    const payment = await this.prisma.paymentIntent.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      return { orderId, status: 'pending', qrCode: null, expiresAt: null };
    }
    return {
      orderId,
      status: payment.status,
      qrCode: payment.qrCode,
      expiresAt: payment.expiresAt,
    };
  }

  async handleWebhook(data: {
    eventId: string;
    paymentId: string;
    status: string;
    orderId?: string;
    restaurantId?: string;
  }) {
    // Check idempotency
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { id: data.eventId },
    });

    if (existingEvent) {
      return { status: 'duplicate', eventId: data.eventId };
    }

    // Find payment intent by Mercado Pago payment ID
    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: { mercadoPagoPaymentId: String(data.paymentId) },
    });

    if (!paymentIntent) {
      return { status: 'not_found', paymentId: data.paymentId };
    }

    // Map Mercado Pago status to our status
    const statusMap: Record<string, PaymentStatus> = {
      approved: 'paid',
      pending: 'pending',
      rejected: 'failed',
      cancelled: 'failed',
      refunded: 'refunded',
    };

    const newStatus = statusMap[data.status] || 'pending';

    // Update payment intent
    const updatedIntent = await this.prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: { status: newStatus },
    });

    // Map to order status
    const orderStatusMap: Record<string, 'paid' | 'pending_payment' | 'cancelled'> = {
      paid: 'paid',
      approved: 'paid',
      pending: 'pending_payment',
      rejected: 'cancelled',
      cancelled: 'cancelled',
      refunded: 'cancelled',
    };

    const orderStatus = orderStatusMap[data.status] || 'pending_payment';

    // Update order
    await this.prisma.order.update({
      where: { id: updatedIntent.orderId },
      data: {
        status: orderStatus,
        paymentStatus: newStatus,
      },
    });

    // Record webhook event for idempotency
    await this.prisma.webhookEvent.create({
      data: {
        id: data.eventId,
        eventType: 'payment',
        processedAt: new Date(),
      },
    });

    return { status: 'success', orderId: updatedIntent.orderId };
  }
}
