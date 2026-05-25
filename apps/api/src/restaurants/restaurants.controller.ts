import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os restaurantes' })
  @ApiResponse({ status: 200, description: 'Lista de restaurantes' })
  async findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter restaurante por ID' })
  @ApiResponse({ status: 200, description: 'Restaurante encontrado' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obter restaurante por slug' })
  @ApiResponse({ status: 200, description: 'Restaurante encontrado' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async findBySlug(@Param('slug') slug: string) {
    return this.restaurantsService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo restaurante' })
  @ApiResponse({ status: 201, description: 'Restaurante criado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body()
    data: {
      name: string;
      slug?: string;
      description?: string;
      address?: string;
      phone?: string;
    }
  ) {
    return this.restaurantsService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar restaurante' })
  @ApiResponse({ status: 200, description: 'Restaurante atualizado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      slug?: string;
      description?: string;
      active?: boolean;
    }
  ) {
    return this.restaurantsService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desativar restaurante' })
  @ApiResponse({ status: 200, description: 'Restaurante desativado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async deactivate(@Param('id') id: string) {
    return this.restaurantsService.deactivate(id);
  }
}
