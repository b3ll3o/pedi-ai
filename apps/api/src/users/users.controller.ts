import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

import {
  CreateProfileDto,
  UpdateProfileDto,
  UpdateMeDto,
  FindProfilesQueryDto,
} from './dto/users.dto';
import { LgpdService } from './lgpd.service';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly lgpdService: LgpdService
  ) {}

  // ── Rotas do próprio usuário autenticado ─────────────────────

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getMe(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.findById(req.user.id);
  }

  @Get('me/profiles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter perfis do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfis do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getMyProfiles(@Req() req: { user: AuthenticatedUser }) {
    return this.usersService.getProfilesByUserId(req.user.id);
  }

  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Tentativa de alterar role/email/restaurantId (proibido)',
  })
  async updateMe(@Req() req: { user: AuthenticatedUser }, @Body() body: UpdateMeDto) {
    // Auditoria ACHADO-33 (Re-varredura 6): agora chama `updateOwnProfile`
    // (defesa em profundidade contra privilege self-escalation), em vez de
    // `updateProfile` (que tem guards de role/tenant admin-side). O
    // service rejeita explicitamente qualquer tentativa de injetar
    // role/email/restaurantId, mesmo que o DTO evolua no futuro.
    return this.usersService.updateOwnProfile(req.user.id, body);
  }

  /**
   * LGPD art. 18, V — direito de acesso.
   *
   * Retorna JSON agregado com todos os dados pessoais do titular sob
   * custódia do controlador. NÃO inclui segredos criptográficos
   * (passwordHash, hash de refresh token, valor raw de reset token).
   *
   * Resposta em <500ms (P95) — síncrono, atende SLA de 15 dias do art. 18, §5º.
   *
   * @spec(RF-AUTH-12)
   */
  @Get('me/export')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Exportar todos os dados pessoais do usuário autenticado (LGPD art. 18, V)',
  })
  @ApiResponse({ status: 200, description: 'JSON estruturado com dados do titular' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async exportMe(@Req() req: { user: AuthenticatedUser }) {
    return this.lgpdService.exportUserData(req.user.id);
  }

  /**
   * LGPD art. 18, VI — direito de eliminação.
   *
   * Anonimiza os campos PII do perfil (email, nome, passwordHash) e
   * revoga todas as credenciais ativas. Preserva Orders/PaymentIntents
   * para fins de auditoria fiscal (art. 27 LGPD + Receita Federal).
   *
   * Rate limit dedicado (3/hora) para desencorajar abuso/accidental click.
   * Idempotente: segunda chamada detecta email já anonimizado.
   *
   * @spec(RF-AUTH-13)
   */
  @Delete('me')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Anonimizar conta do usuário autenticado (LGPD art. 18, VI)',
  })
  @ApiResponse({ status: 200, description: 'Conta anonimizada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido (3/hora)' })
  async deleteMe(@Req() req: { user: AuthenticatedUser }) {
    return this.lgpdService.anonymizeOwnAccount(req.user.id);
  }

  // ── Rotas administrativas (RBAC: dono | gerente) ─────────────

  @Get('profiles')
  @Roles('dono', 'gerente')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar usuários do restaurante autenticado' })
  @ApiResponse({ status: 200, description: 'Página de usuários' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async getProfilesByRestaurant(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: FindProfilesQueryDto,
    @Query() page: PageQueryDto
  ) {
    // Tenant isolation: usar `req.user.restaurantId` (do JWT), nunca o query param.
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return this.usersService.findByRestaurant(req.user.restaurantId, query, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  @Get('profiles/:id')
  @Roles('cliente', 'atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter perfil por ID' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado — perfil de outro tenant' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  async getProfileById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    const profile = await this.usersService.findById(id);
    if (!profile) {
      throw new NotFoundException('Perfil não encontrado');
    }
    // Auditoria C5 — BOLA/IDOR protection. A condição anterior
    // (`!isOwnProfile && !isSameRestaurant && !isAdmin`) tinha
    // semântica errada: se isAdmin=true (qualquer dono/gerente),
    // permitia acesso cross-tenant. A regra correta é:
    //  - O próprio user sempre pode ver seu perfil.
    //  - Staff admin (dono/gerente) só pode ver perfis do **próprio
    //    restaurante**.
    //  - Cliente/atendente sem admin só pode ver o próprio perfil.
    const isOwnProfile = profile.userId === req.user.id;
    const isSameRestaurant =
      req.user.restaurantId != null && profile.restaurantId === req.user.restaurantId;
    const isAdmin = ['dono', 'gerente'].includes(req.user.role);

    const authorized = isOwnProfile || (isAdmin && isSameRestaurant);
    if (!authorized) {
      throw new ForbiddenException('Acesso negado a perfil de outro restaurante');
    }
    return profile;
  }

  @Post('profiles')
  @Roles('dono', 'gerente')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo perfil no restaurante' })
  @ApiResponse({ status: 201, description: 'Perfil criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async createProfile(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateProfileDto) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    // Sobrescreve restaurantId do body com o do JWT (BOLA protection).
    return this.usersService.createProfile({ ...data, restaurantId: req.user.restaurantId });
  }

  @Patch('profiles/:id')
  @Roles('dono', 'gerente')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar perfil' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Perfil não encontrado' })
  async updateProfile(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(id, data, req.user);
  }

  @Delete('profiles/:id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remover perfil (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Perfil removido' })
  @ApiResponse({ status: 403, description: 'Acesso restrito ao dono' })
  async deleteProfile(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    if (id === req.user.id) {
      throw new BadRequestException('Não é possível remover o próprio perfil');
    }
    return this.usersService.deleteProfile(id, req.user.restaurantId);
  }
}
