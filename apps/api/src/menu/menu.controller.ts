import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { MenuService } from './menu.service';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Obter cardápio do restaurante' })
  @ApiResponse({ status: 200, description: 'Cardápio retornado com sucesso' })
  @ApiResponse({ status: 400, description: 'restaurantId é obrigatório' })
  async getMenu(@Query('restaurantId') restaurantId: string) {
    return this.menuService.getMenuByRestaurant(restaurantId);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Obter produto do cardápio' })
  @ApiResponse({ status: 200, description: 'Produto retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async getProductById(@Param('id') id: string, @Query('restaurantId') restaurantId: string) {
    const product = await this.menuService.getProductById(id, restaurantId);
    if (!product) {
      return { error: 'Product not found' };
    }
    return product;
  }
}
