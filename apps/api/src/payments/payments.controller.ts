import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix/create')
  async createPixPayment(@Body() data: {
    orderId: string;
    restaurantId: string;
    amount: number;
  }) {
    return this.paymentsService.createPixPayment(data);
  }

  @Get('pix/status/:orderId')
  async getPixStatus(@Param('orderId') orderId: string) {
    // Busca o payment pelo orderId
    return { orderId, status: 'pending' };
  }

  @Post('webhooks/pix')
  async handlePixWebhook(@Body() data: { paymentId: string; status: string }) {
    return this.paymentsService.handleWebhook(data);
  }
}
