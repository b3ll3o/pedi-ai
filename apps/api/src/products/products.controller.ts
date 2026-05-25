import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos por restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.productsService.findByRestaurant(restaurantId);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Listar produtos por categoria' })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.productsService.findByCategory(categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter produto por ID' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body()
    data: {
      categoryId: string;
      name: string;
      description?: string;
      imageUrl?: string;
      price: number;
      dietaryLabels?: string;
      sortOrder?: number;
    }
  ) {
    return this.productsService.create(data);
  }

  @Post('with-restaurant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Criar produto com restaurantId (acha primeira categoria se não especificada)',
  })
  @ApiResponse({ status: 201, description: 'Produto criado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async createWithRestaurant(
    @Body()
    data: {
      categoryId?: string;
      restaurantId: string;
      name: string;
      description?: string;
      imageUrl?: string;
      price: number;
      dietaryLabels?: string;
      sortOrder?: number;
    }
  ) {
    return this.productsService.createWithRestaurant(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      description?: string;
      price?: number;
      available?: boolean;
    }
  ) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir produto' })
  @ApiResponse({ status: 200, description: 'Produto excluído' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
    return { success: true };
  }
}
