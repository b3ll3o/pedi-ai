import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos por restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos' })
  async findAll(@Query('restaurantId') restaurantId: string) {
    return this.ordersService.findByRestaurant(restaurantId);
  }

  @Get('customer')
  @ApiOperation({ summary: 'Listar pedidos por cliente' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos do cliente' })
  async findByCustomer(
    @Query('customerId') customerId: string,
    @Query('restaurantId') restaurantId: string
  ) {
    return this.ordersService.findByCustomer(customerId, restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter pedido por ID' })
  @ApiResponse({ status: 200, description: 'Pedido encontrado' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async findById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado' })
  async create(
    @Body()
    data: {
      restaurantId: string;
      tableId?: string;
      customerId?: string;
      customerPhone?: string;
      customerName?: string;
      customerEmail?: string;
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
    }
  ) {
    return this.ordersService.create(data);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string; notes?: string }) {
    return this.ordersService.updateStatus(id, body.status as OrderStatus, body.notes);
  }
}
