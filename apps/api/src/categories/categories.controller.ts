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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * GET público — clientes acessam o cardápio sem autenticação.
   * `restaurantId` vem do query (público).
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar categorias por restaurante (público)' })
  @ApiResponse({ status: 200, description: 'Lista de categorias' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.categoriesService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obter categoria por ID' })
  @ApiResponse({ status: 200, description: 'Categoria encontrada' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar nova categoria' })
  @ApiResponse({ status: 201, description: 'Categoria criada' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async create(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateCategoryDto) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return this.categoriesService.create({
      ...data,
      restaurantId: req.user.restaurantId,
    });
  }

  @Patch(':id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar categoria' })
  @ApiResponse({ status: 200, description: 'Categoria atualizada' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateCategoryDto
  ) {
    return this.categoriesService.update(id, data, req.user.restaurantId);
  }

  @Delete(':id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir categoria (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Categoria excluída' })
  @ApiResponse({ status: 403, description: 'Acesso restrito ao dono' })
  async delete(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.categoriesService.delete(id, req.user.restaurantId);
    return { success: true };
  }

  @Post('reorder')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reordenar categorias' })
  @ApiResponse({ status: 200, description: 'Categorias reordenadas' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async reorder(
    @Req() req: { user: AuthenticatedUser },
    @Body() categories: Array<{ id: string; sortOrder: number }>
  ) {
    await this.categoriesService.reorder(categories, req.user.restaurantId);
    return { success: true };
  }
}
