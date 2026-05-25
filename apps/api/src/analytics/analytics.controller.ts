import { Controller, Get, Query } from '@nestjs/common';

import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  async getOverview(
    @Query('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getOverview({ restaurantId, startDate, endDate });
  }

  @Get('overview-detailed')
  async getOverviewDetailed(
    @Query('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getOverviewDetailed({ restaurantId, startDate, endDate });
  }

  @Get('daily-orders')
  async getDailyOrders(
    @Query('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getDailyOrders({ restaurantId, startDate, endDate });
  }

  @Get('popular-items')
  async getPopularItems(
    @Query('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getPopularItems({ restaurantId, startDate, endDate });
  }

  @Get('orders-by-status')
  async getOrdersByStatus(
    @Query('restaurantId') restaurantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.service.getOrdersByStatus({ restaurantId, startDate, endDate });
  }
}
