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

import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorias por restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de categorias' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.categoriesService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter categoria por ID' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar nova categoria' })
  @ApiResponse({ status: 201, description: 'Categoria criada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body()
    data: {
      restaurantId: string;
      name: string;
      description?: string;
      imageUrl?: string;
      sortOrder?: number;
    }
  ) {
    return this.categoriesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string; sortOrder?: number }
  ) {
    return this.categoriesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir categoria' })
  @ApiResponse({ status: 200, description: 'Categoria excluída' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async delete(@Param('id') id: string) {
    await this.categoriesService.delete(id);
    return { success: true };
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reordenar categorias' })
  @ApiResponse({ status: 200, description: 'Categorias reordenadas' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async reorder(@Body() categories: Array<{ id: string; sortOrder: number }>) {
    await this.categoriesService.reorder(categories);
    return { success: true };
  }
}
