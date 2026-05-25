import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar pagamento PIX' })
  @ApiResponse({ status: 201, description: 'Pagamento PIX criado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async createPixPayment(@Body() data: { orderId: string; restaurantId: string; amount: number }) {
    return this.paymentsService.createPixPayment(data);
  }

  @Get('pix/status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Verificar status do PIX' })
  @ApiResponse({ status: 200, description: 'Status do pagamento' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getPixStatus(@Param('orderId') orderId: string) {
    return { orderId, status: 'pending' };
  }

  @Post('webhooks/pix')
  @ApiOperation({ summary: 'Webhook PIX do Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Webhook processado' })
  async handlePixWebhook(@Body() data: { paymentId: string; status: string }) {
    return this.paymentsService.handleWebhook(data);
  }
}
