import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar pagamento PIX' })
  @ApiResponse({ status: 201, description: 'Pagamento PIX criado' })
  async createPixPayment(@Body() data: { orderId: string; restaurantId: string; amount: number }) {
    return this.paymentsService.createPixPayment(data);
  }

  @Get('pix/status/:orderId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar status do PIX' })
  @ApiResponse({ status: 200, description: 'Status do pagamento' })
  async getPixStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatusByOrder(orderId);
  }

  @Post('webhooks/pix')
  @ApiOperation({ summary: 'Webhook PIX do Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  async handlePixWebhook(
    @Body()
    data: {
      id: string | number;
      type: string;
      data: { id: string | number };
    }
  ) {
    // Only process payment events
    if (data.type !== 'payment' || !data.data?.id) {
      return { status: 'ignored' };
    }

    const paymentId = String(data.data.id);

    // Fetch full payment details from Mercado Pago to get status
    const mpAccessToken = process.env.MP_ACCESS_TOKEN;
    if (!mpAccessToken) {
      return { status: 'error', message: 'MP_ACCESS_TOKEN not configured' };
    }

    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!mpResponse.ok) {
        return { status: 'error', message: 'Failed to fetch payment from Mercado Pago' };
      }

      const mpPayment = await mpResponse.json();
      const orderId = mpPayment.metadata?.order_id;

      return this.paymentsService.handleWebhook({
        eventId: String(data.id),
        paymentId,
        status: mpPayment.status,
        orderId,
      });
    } catch (error) {
      return { status: 'error', message: 'Error processing webhook' };
    }
  }
}
