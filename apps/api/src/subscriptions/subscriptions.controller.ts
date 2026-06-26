import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';

import { CreateSubscriptionDto } from './dto/subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * `restaurantId` vem SEMPRE do JWT — query param é IGNORADO.
   * Dono vê a assinatura do próprio restaurante; gerente também.
   */
  @Get()
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter assinatura do restaurante autenticado' })
  @ApiResponse({ status: 200, description: 'Assinatura encontrada' })
  @ApiResponse({ status: 403, description: 'Usuário sem restaurante vinculado' })
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada' })
  async getSubscription(
    @Req() req: { user: AuthenticatedUser },
    @Query('restaurantId') _ignoredRestaurantId?: string
  ) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    const subscription = await this.subscriptionsService.findByRestaurant(req.user.restaurantId);
    if (!subscription) {
      return { subscription: null };
    }
    return { subscription };
  }

  /**
   * Criação/atualização de assinatura — apenas `dono`.
   * `restaurantId` do body é IGNORADO em favor do JWT (BOLA prevention).
   */
  @Post()
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar ou atualizar assinatura (apenas dono)' })
  @ApiResponse({ status: 201, description: 'Assinatura criada/atualizada' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso restrito ao dono' })
  async createOrUpdate(
    @Req() req: { user: AuthenticatedUser },
    @Body() data: CreateSubscriptionDto
  ) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    // Auditoria M-03: NÃO passar `data.priceCents` — preço é 100% server-side.
    const subscription = await this.subscriptionsService.createOrUpdate({
      restaurantId: req.user.restaurantId,
      planType: data.planType,
    });
    return { subscription };
  }
}
