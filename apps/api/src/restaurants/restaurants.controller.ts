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
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurants.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar todos os restaurantes (público)' })
  @ApiResponse({ status: 200, description: 'Página de restaurantes' })
  async findAll(@Query() page: PageQueryDto) {
    return this.restaurantsService.findAll(true, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obter restaurante por ID' })
  @ApiResponse({ status: 200, description: 'Restaurante encontrado' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async findById(@Param('id') id: string) {
    return this.restaurantsService.findById(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Obter restaurante por slug' })
  @ApiResponse({ status: 200, description: 'Restaurante encontrado' })
  @ApiResponse({ status: 404, description: 'Restaurante não encontrado' })
  async findBySlug(@Param('slug') slug: string) {
    return this.restaurantsService.findBySlug(slug);
  }

  @Get('user/me')
  @Roles('atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar restaurantes do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de restaurantes' })
  async findByUser(@Req() req: { user: AuthenticatedUser }) {
    // Auditoria M1: antes 3 queries (profiles + restaurants + groupBy), agora 2 paralelas.
    // profiles.findMany serve como fonte única para `role` (vínculo) e para
    // construir o IN(...) usado em restaurants.findMany e groupBy(team_count).
    //
    // Auditoria ACHADO-35 (Re-varredura 7): filtra restaurantes DESATIVADOS
    // (`active: false`) ANTES de retornar. Antes, donos viam restaurantes
    // desativados pelo admin (ex: por inadimplência) na lista — vazamento
    // de informação desnecessário e inconsistência com rotas públicas
    // (que já filtram `active: true`).
    const profiles = await this.prisma.usersProfile.findMany({
      where: { userId: req.user.id, restaurantId: { not: null } },
      select: { restaurantId: true, role: true },
    });
    const restaurantIds = Array.from(new Set(profiles.map((p) => p.restaurantId as string)));
    if (restaurantIds.length === 0) return [];

    const [restaurants, profilesCount] = await Promise.all([
      // Apenas restaurantes ativos. Restaurante desativado pelo admin não
      // aparece na lista do dono — admin/staff continuam acessando via
      // rota autenticada de staff com escopo admin.
      this.restaurantsService.findByIds(restaurantIds, { activeOnly: true }),
      this.prisma.usersProfile.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: restaurantIds } },
        _count: true,
      }),
    ]);

    const roleMap: Record<string, string> = {};
    for (const p of profiles) {
      if (p.restaurantId) roleMap[p.restaurantId] = p.role;
    }
    const teamCountMap: Record<string, number> = {};
    for (const p of profilesCount) {
      if (p.restaurantId) teamCountMap[p.restaurantId] = p._count;
    }

    return restaurants.map((r) => ({
      ...r,
      role: roleMap[r.id] || 'cliente',
      // B1: camelCase canônico + alias snake_case para compatibilidade.
      teamCount: teamCountMap[r.id] || 0,
      team_count: teamCountMap[r.id] || 0,
    }));
  }

  @Get('user/me/with-trial')
  @Roles('atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar restaurantes em trial do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de restaurantes em trial' })
  async findByUserWithTrial(@Req() req: { user: AuthenticatedUser }) {
    return this.restaurantsService.findByUserIdWithTrial(req.user.id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo restaurante (vínculo automático ao usuário)' })
  @ApiResponse({ status: 201, description: 'Restaurante criado' })
  async create(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateRestaurantDto) {
    return this.restaurantsService.createWithOwner({
      ...data,
      ownerId: req.user.id,
      ownerEmail: req.user.email,
    });
  }

  @Patch(':id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar restaurante' })
  @ApiResponse({ status: 200, description: 'Restaurante atualizado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateRestaurantDto
  ) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    // Gerente só edita o próprio tenant; dono pode editar o próprio e
    // outros restaurantes sob sua governança (multi-restaurante futuro).
    if (req.user.restaurantId !== id && req.user.role !== 'dono') {
      throw new ForbiddenException('Só pode editar seu próprio restaurante');
    }
    // **Toggle de `active` é restrito a dono.** Gerente não pode colocar o
    // restaurante inteiro offline nem reativar sem aprovação — reduz risco
    // de DoS de tenant por usuário interno.
    if (data.active !== undefined && req.user.role !== 'dono') {
      throw new ForbiddenException('Apenas dono pode alterar o status ativo do restaurante');
    }
    return this.restaurantsService.update(id, data);
  }

  @Delete(':id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desativar restaurante (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Restaurante desativado' })
  async deactivate(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    if (req.user.restaurantId !== id) {
      throw new ForbiddenException('Só pode desativar seu próprio restaurante');
    }
    return this.restaurantsService.deactivate(id);
  }
}
