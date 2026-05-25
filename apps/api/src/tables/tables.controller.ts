import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { TablesService } from './tables.service';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mesas por restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de mesas' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.tablesService.findByRestaurant(restaurantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter mesa por ID' })
  @ApiResponse({ status: 200, description: 'Mesa encontrada' })
  @ApiResponse({ status: 404, description: 'Mesa não encontrada' })
  async findById(@Param('id') id: string) {
    return this.tablesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar nova mesa' })
  @ApiResponse({ status: 201, description: 'Mesa criada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(
    @Body()
    data: {
      restaurantId: string;
      name: string;
      number?: number;
      capacity?: number;
    }
  ) {
    return this.tablesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar mesa' })
  @ApiResponse({ status: 200, description: 'Mesa atualizada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; number?: number; capacity?: number; active?: boolean }
  ) {
    return this.tablesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Desativar mesa' })
  @ApiResponse({ status: 200, description: 'Mesa desativada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async deactivate(@Param('id') id: string) {
    return this.tablesService.deactivate(id);
  }

  @Post(':id/reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reativar mesa' })
  @ApiResponse({ status: 200, description: 'Mesa reativada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async reactivate(@Param('id') id: string) {
    return this.tablesService.reactivate(id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Gerar QR code da mesa' })
  @ApiResponse({ status: 200, description: 'QR code gerado' })
  async generateQr(@Param('id') id: string) {
    return this.tablesService.generateQrCode(id);
  }

  @Post('validate')
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
    const { restaurant_id, table_id, signature } = body;

    const isValid = await this.tablesService.validateQrCode(restaurant_id, table_id, signature);

    if (!isValid) {
      return { valid: false, error: 'Assinatura inválida' };
    }

    const table = await this.tablesService.findById(table_id).catch(() => null);
    if (!table || table.restaurantId !== restaurant_id) {
      return { valid: false, error: 'Mesa não encontrada' };
    }

    return {
      valid: true,
      table: {
        id: table.id,
        name: table.name ?? `Mesa ${table.number}`,
        number: table.number,
      },
    };
  }
}
