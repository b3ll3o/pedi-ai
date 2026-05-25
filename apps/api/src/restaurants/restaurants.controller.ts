import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PrismaService } from '../common/prisma.service';

import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly prisma: PrismaService
  ) {}

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

  @Get('user/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar restaurantes do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de restaurantes' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findByUser(@Request() req: { user: AuthenticatedUser }) {
    const restaurants = await this.restaurantsService.findByUserId(req.user.id);
    const profiles = await this.prisma.usersProfile.findMany({
      where: { userId: req.user.id, restaurantId: { not: null } },
    });
    const teamCountMap: Record<string, number> = {};
    if (restaurants.length > 0) {
      const restaurantIds = restaurants.map((r) => r.id);
      const profilesCount = await this.prisma.usersProfile.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: restaurantIds } },
        _count: true,
      });
      for (const p of profilesCount) {
        if (p.restaurantId) teamCountMap[p.restaurantId] = p._count;
      }
    }
    const profileMap: Record<string, string> = {};
    for (const p of profiles) {
      if (p.restaurantId) profileMap[p.restaurantId] = p.role;
    }
    return restaurants.map((r) => ({
      ...r,
      role: profileMap[r.id] || 'cliente',
      team_count: teamCountMap[r.id] || 0,
    }));
  }

  @Get('user/me/with-trial')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar restaurantes em trial do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de restaurantes em trial' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async findByUserWithTrial(@Request() req: { user: AuthenticatedUser }) {
    return this.restaurantsService.findByUserIdWithTrial(req.user.id);
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
      logoUrl?: string;
    },
    @Request() req: { user: AuthenticatedUser }
  ) {
    return this.restaurantsService.createWithOwner({
      ...data,
      ownerId: req.user.id,
      ownerEmail: req.user.email,
    });
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
      settings?: string;
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
