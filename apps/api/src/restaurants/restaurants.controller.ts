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
import { PageQueryDto } from '../common/dto/pagination.dto';

import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurants.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  // Auditoria ACHADO-N15 (Re-varredura 9): controller NÃO injeta PrismaService.
  // Antes, `findByUser` executava `prisma.usersProfile.findMany` +
  // `prisma.usersProfile.groupBy` direto no controller (DDD leak, lógica
  // de acesso a dados no presentation). Toda a query está agora em
  // `RestaurantsService.findByUserWithTeamCount()`. Controllers orquestram
  // (HTTP → service), nunca acessam Prisma diretamente.
  constructor(private readonly restaurantsService: RestaurantsService) {}

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
    const items = await this.restaurantsService.findByUserWithTeamCount(req.user.id);
    // B1: camelCase canônico + alias snake_case para compatibilidade com
    // frontends legados. Conversão aplicada no presentation (não no service).
    return items.map((r) => ({
      ...r,
      team_count: r.teamCount,
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
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo restaurante (vínculo automático ao usuário)' })
  @ApiResponse({ status: 201, description: 'Restaurante criado' })
  @ApiResponse({ status: 403, description: 'Apenas dono pode criar restaurantes' })
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
