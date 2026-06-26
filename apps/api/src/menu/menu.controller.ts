import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';

import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obter cardápio do restaurante' })
  @ApiResponse({ status: 200, description: 'Cardápio retornado com sucesso' })
  @ApiResponse({ status: 400, description: 'restaurantId é obrigatório' })
  async getMenu(@Query('restaurantId') restaurantId: string) {
    return this.menuService.getMenuByRestaurant(restaurantId);
  }

  @Get('products/:id')
  @Public()
  @ApiOperation({ summary: 'Obter produto do cardápio' })
  @ApiResponse({ status: 200, description: 'Produto retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProductById(@Param('id') id: string, @Query('restaurantId') restaurantId: string) {
    const product = await this.menuService.getProductById(id, restaurantId);
    if (!product) {
      // Antes retornava `{ error: 'Product not found' }` com 200 — quebrava contrato REST.
      // Agora NestJS converte `NotFoundException` para 404 automaticamente.
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }
}
