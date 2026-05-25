import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter assinatura do restaurante' })
  @ApiResponse({ status: 200, description: 'Assinatura encontrada' })
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada' })
  async getSubscription(@Query('restaurantId') restaurantId: string) {
    const subscription = await this.subscriptionsService.findByRestaurant(restaurantId);
    if (!subscription) {
      return { error: 'Assinatura não encontrada' };
    }
    return { subscription };
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar ou atualizar assinatura' })
  @ApiResponse({ status: 201, description: 'Assinatura criada/atualizada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createOrUpdate(
    @Body() data: { restaurantId: string; planType: string; priceCents?: number }
  ) {
    const subscription = await this.subscriptionsService.createOrUpdate(data);
    return { subscription };
  }
}
