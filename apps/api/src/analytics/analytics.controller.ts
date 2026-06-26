import { Controller, Get, Query, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  /**
   * ⚠️ TODAS as rotas de analytics exigem role `gerente` ou `dono`.
   * `restaurantId` é SEMPRE extraído do JWT — query param é ignorado.
   */
  private buildQuery(req: { user: AuthenticatedUser }, startDate?: string, endDate?: string) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return {
      restaurantId: req.user.restaurantId,
      startDate,
      endDate,
    };
  }

  @Get('overview')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Overview de pedidos' })
  @ApiResponse({ status: 200, description: 'Overview' })
  @ApiResponse({ status: 403, description: 'Acesso restrito a gerente/dono' })
  async getOverview(
    @Req() req: { user: AuthenticatedUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getOverview(this.buildQuery(req, startDate, endDate));
  }

  @Get('overview-detailed')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Overview detalhado' })
  @ApiResponse({ status: 200, description: 'Overview detalhado' })
  async getOverviewDetailed(
    @Req() req: { user: AuthenticatedUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getOverviewDetailed(this.buildQuery(req, startDate, endDate));
  }

  @Get('daily-orders')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Pedidos diários (últimos 30 dias)' })
  @ApiResponse({ status: 200, description: 'Pedidos diários' })
  async getDailyOrders(
    @Req() req: { user: AuthenticatedUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getDailyOrders(this.buildQuery(req, startDate, endDate));
  }

  @Get('popular-items')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Itens mais populares' })
  @ApiResponse({ status: 200, description: 'Itens populares' })
  async getPopularItems(
    @Req() req: { user: AuthenticatedUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getPopularItems(this.buildQuery(req, startDate, endDate));
  }

  @Get('orders-by-status')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Pedidos agrupados por status' })
  @ApiResponse({ status: 200, description: 'Pedidos por status' })
  async getOrdersByStatus(
    @Req() req: { user: AuthenticatedUser },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getOrdersByStatus(this.buildQuery(req, startDate, endDate));
  }
}
