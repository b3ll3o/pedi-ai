import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query('restaurantId') restaurantId: string) {
    return this.ordersService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post()
  async create(@Body() data: {
    restaurantId: string;
    tableId?: string;
    customerId?: string;
    customerPhone?: string;
    customerName?: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod?: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'other';
    idempotencyKey?: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes?: string;
    }>;
  }) {
    return this.ordersService.create(data);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.ordersService.updateStatus(id, body.status as OrderStatus, body.notes);
  }
}
