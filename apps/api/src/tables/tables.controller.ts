import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

import { CreateTableDto, UpdateTableDto } from './dto/tables.dto';
import { TablesService } from './tables.service';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @Roles('atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar mesas do restaurante autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de mesas' })
  async findByRestaurant(@Req() req: { user: AuthenticatedUser }) {
    return this.tablesService.findByRestaurant(req.user.restaurantId);
  }

  @Get(':id')
  @Roles('atendente', 'gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter mesa por ID' })
  @ApiResponse({ status: 200, description: 'Mesa encontrada' })
  @ApiResponse({ status: 404, description: 'Mesa não encontrada' })
  async findById(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.tablesService.findById(id, req.user.restaurantId);
  }

  @Post()
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar nova mesa' })
  @ApiResponse({ status: 201, description: 'Mesa criada' })
  async create(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateTableDto) {
    return this.tablesService.create({ ...data, restaurantId: req.user.restaurantId });
  }

  @Patch(':id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar mesa' })
  @ApiResponse({ status: 200, description: 'Mesa atualizada' })
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateTableDto
  ) {
    return this.tablesService.update(id, data, req.user.restaurantId);
  }

  @Delete(':id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desativar mesa (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Mesa desativada' })
  async deactivate(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.tablesService.deactivate(id, req.user.restaurantId);
    return { success: true };
  }

  @Post(':id/reactivate')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reativar mesa' })
  @ApiResponse({ status: 200, description: 'Mesa reativada' })
  async reactivate(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.tablesService.reactivate(id, req.user.restaurantId);
    return { success: true };
  }

  @Get(':id/qr')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Gerar QR code da mesa' })
  @ApiResponse({ status: 200, description: 'QR code gerado' })
  async generateQr(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.tablesService.generateQrCode(id, req.user.restaurantId);
  }

  /**
   * Validação server-side do QR code — defesa em profundidade.
   * O frontend também valida (UX), mas o backend é a fonte de verdade.
   *
   * Auditoria M-NEW-06: usa `validateQrAndGet` consolidado — antes o controller
   * encadeava `validateQrCode` + `validateTable` + `findById` = 3 chamadas
   * ao service (2 queries). Agora: 1 query + 1 validação HMAC local.
   */
  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Validar QR code de mesa' })
  @ApiResponse({ status: 200, description: 'Validação realizada com sucesso' })
  async validateQrCode(
    @Body()
    body: {
      restaurant_id: string;
      table_id: string;
      timestamp: number;
      signature: string;
    }
  ) {
    const { restaurant_id, table_id, signature, timestamp } = body;

    const result = await this.tablesService.validateQrAndGet(
      restaurant_id,
      table_id,
      timestamp,
      signature
    );

    if (!result.valid) {
      return { valid: false, error: result.error };
    }

    return {
      valid: true,
      table: {
        id: result.table.id,
        name: result.table.name ?? `Mesa ${result.table.number}`,
        number: result.table.number,
      },
    };
  }
}
