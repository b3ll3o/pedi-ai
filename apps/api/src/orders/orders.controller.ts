import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ForbiddenException,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

import { CreateOrderDto, UpdateOrderStatusDto } from './dto/orders.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Lista pedidos do restaurante do usuário autenticado.
   * Query param `restaurantId` é IGNORADO em favor do JWT.
   *
   * Paginação cursor-based: `?cursor=<id>&limit=<n>` (limit ≤ 100).
   */
  @Get()
  @Roles('atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos do restaurante autenticado' })
  @ApiResponse({ status: 200, description: 'Página de pedidos' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async findAll(@Req() req: { user: AuthenticatedUser }, @Query() page: PageQueryDto) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return this.ordersService.findByRestaurant(req.user.restaurantId, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  /**
   * Pedidos do próprio cliente (customer). Usa `req.user.id` — ignora query param.
   *
   * Paginação cursor-based: `?cursor=<id>&limit=<n>`.
   */
  @Get('customer')
  @Roles('cliente', 'atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos do cliente autenticado' })
  @ApiResponse({ status: 200, description: 'Página de pedidos' })
  async findByCustomer(@Req() req: { user: AuthenticatedUser }, @Query() page: PageQueryDto) {
    return this.ordersService.findByCustomer(req.user.id, req.user.restaurantId, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  /**
   * Pedido por ID. Valida ownership antes de retornar:
   * - Staff (`atendente | gerente | dono`): precisa estar vinculado ao
   *   mesmo restaurante do pedido.
   * - Cliente: precisa ser o `customerId` do pedido.
   *
   * Rota protegida por JWT — rota pública (QR-only) foi removida para
   * prevenir IDOR/BOLA cross-tenant (ver auditoria C4).
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('cliente', 'atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter pedido por ID' })
  @ApiResponse({ status: 200, description: 'Pedido encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para este pedido' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async findById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.ordersService.findById(id, {
      requesterUserId: req.user.id,
      requesterRole: req.user.role,
      requesterRestaurantId: req.user.restaurantId ?? null,
    });
  }

  /**
   * Criação de pedido. Rota PÚBLICA para clientes em mesa (via QR).
   *
   * Validações server-side:
   * - `restaurantId` do body deve bater com QR (ou JWT se autenticado).
   * - `customerId`: **auditoria A14** — se o cliente está autenticado,
   *   o `customerId` do body é **sempre sobrescrito** com `req.user.id`
   *   (antes validava apenas se igual, mas o body ainda podia trazer
   *   um customerId arbitrário para pedidos anônimos). Agora, se não
   *   autenticado, o cliente não pode atribuir o pedido a outro
   *   `customerId` no body — o campo é **removido** se enviado.
   * - `unitPrice` do body é IGNORADO — preço vem do banco.
   * - Total é RECALCULADO no service (nunca confiar no cliente).
   */
  @Post()
  @Public()
  // Auditoria M-NEW-05: cria pedido é rota PÚBLICA (QR de mesa), vulnerável
  // a flood/spam sem rate-limit. Limite: 30 req/min por IP — o suficiente para
  // 1 pedido a cada 2s em cenário legítimo (cliente adicionando itens).
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Criar novo pedido' })
  @ApiResponse({ status: 201, description: 'Pedido criado' })
  async create(@Req() req: { user?: AuthenticatedUser }, @Body() data: CreateOrderDto) {
    // Auditoria L-NEW-03: nunca mutar o DTO de entrada. Construímos um
    // `sanitized` derivado com overrides server-side e passamos ao service.
    const sanitized: typeof data = { ...data };

    // Se autenticado, restaurantId e customerId devem bater.
    if (req.user) {
      if (req.user.restaurantId && sanitized.restaurantId !== req.user.restaurantId) {
        throw new ForbiddenException('Restaurante não corresponde ao usuário autenticado');
      }
      // Auditoria ACHADO-26 (Re-varredura 6): se o body trouxer `tableId`,
      // precisamos validar que a mesa pertence ao `restaurantId` do JWT
      // (não apenas do body). Antes, esse check só era feito no caminho
      // anônimo (linhas abaixo). Cliente autenticado no restaurante A
      // podia injetar `tableId` de restaurante B — IDOR cross-tenant que
      // resultava em pedido registrado sob mesa de outro tenant.
      if (sanitized.tableId) {
        const table = await this.prisma.table.findUnique({
          where: { id: sanitized.tableId },
          select: { restaurantId: true, active: true },
        });
        if (!table || !table.active) {
          throw new BadRequestException('Mesa inválida ou inativa');
        }
        if (table.restaurantId !== req.user.restaurantId) {
          throw new ForbiddenException('Mesa não pertence ao seu restaurante');
        }
        // Sobrescreve com o valor server-side (autoritativo).
        sanitized.restaurantId = table.restaurantId;
      }
      // Força customerId do JWT, ignora o do body.
      sanitized.customerId = req.user.id;
    } else {
      // Cliente anônimo: nunca aceita customerId do body (impersonation).
      // O pedido fica sem customer vinculado — staff associa depois.
      delete sanitized.customerId;

      // Auditoria M-01: cliente anônimo não pode injetar `restaurantId`
      // arbitrário. Derivar do `tableId` server-side: a mesa pertence
      // a um único restaurante. Se cliente enviar `restaurantId` no body
      // e ele não bater com o da mesa, rejeitar (IDOR entre tenants).
      if (sanitized.tableId) {
        const table = await this.prisma.table.findUnique({
          where: { id: sanitized.tableId },
          select: { restaurantId: true, active: true },
        });
        if (!table || !table.active) {
          throw new BadRequestException('Mesa inválida ou inativa');
        }
        if (sanitized.restaurantId && sanitized.restaurantId !== table.restaurantId) {
          throw new ForbiddenException('Mesa não pertence ao restaurante informado');
        }
        // Sobrescreve com o valor server-side (autoritativo).
        sanitized.restaurantId = table.restaurantId;
      }
    }

    if (!sanitized.items || sanitized.items.length === 0) {
      throw new BadRequestException('Pedido deve ter ao menos um item');
    }

    return this.ordersService.create(sanitized);
  }

  /**
   * Atualização de status. Apenas staff do restaurante.
   */
  @Patch(':id/status')
  @Roles('atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar status do pedido' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado' })
  async updateStatus(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() body: UpdateOrderStatusDto
  ) {
    return this.ordersService.updateStatus(
      id,
      body.status as OrderStatus,
      body.notes,
      req.user.restaurantId
    );
  }
}
