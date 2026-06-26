import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageQueryDto } from '../common/dto/pagination.dto';

import { CreateProductDto, UpdateProductDto } from './dto/products.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar produtos por restaurante (público)' })
  @ApiResponse({ status: 200, description: 'Lista de produtos' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.productsService.findByRestaurant(restaurantId);
  }

  @Get('category/:categoryId')
  @Public()
  @ApiOperation({ summary: 'Listar produtos por categoria (público)' })
  @ApiResponse({ status: 200, description: 'Página de produtos' })
  async findByCategory(@Param('categoryId') categoryId: string, @Query() page: PageQueryDto) {
    return this.productsService.findByCategory(categoryId, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obter produto por ID (público)' })
  @ApiResponse({ status: 200, description: 'Produto encontrado' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo produto' })
  @ApiResponse({ status: 201, description: 'Produto criado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async create(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateProductDto) {
    if (!data.categoryId) {
      throw new BadRequestException('categoryId é obrigatório');
    }
    return this.productsService.create({
      categoryId: data.categoryId,
      restaurantId: req.user.restaurantId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      price: data.price,
      dietaryLabels: data.dietaryLabels,
      sortOrder: data.sortOrder,
    });
  }

  @Post('with-restaurant')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar produto com restaurantId' })
  @ApiResponse({ status: 201, description: 'Produto criado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async createWithRestaurant(
    @Req() req: { user: AuthenticatedUser },
    @Body() data: CreateProductDto
  ) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return this.productsService.createWithRestaurant({
      ...data,
      restaurantId: req.user.restaurantId,
    });
  }

  @Patch(':id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiResponse({ status: 200, description: 'Produto atualizado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateProductDto
  ) {
    return this.productsService.update(id, data, req.user.restaurantId);
  }

  @Delete(':id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir produto (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Produto excluído' })
  @ApiResponse({ status: 403, description: 'Acesso restrito ao dono' })
  async delete(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.productsService.delete(id, req.user.restaurantId);
    return { success: true };
  }
}
