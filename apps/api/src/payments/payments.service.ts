import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPixPayment(data: {
    orderId: string;
    restaurantId: string;
    amount: number;
  }) {
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

  async handleWebhook(data: { paymentId: string; status: string }) {
    const payment = await this.prisma.paymentIntent.findFirst({
      where: { mercadoPagoPaymentId: data.paymentId },
    });

    if (!payment) {
      return null;
    }

    const updated = await this.prisma.paymentIntent.update({
      where: { id: payment.id },
      data: { status: data.status as PaymentStatus },
    });

    await this.prisma.order.update({
      where: { id: updated.orderId },
      data: { paymentStatus: data.status as PaymentStatus },
    });

    return updated;
  }
}
