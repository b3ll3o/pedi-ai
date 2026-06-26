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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageQueryDto } from '../common/dto/pagination.dto';

import { CombosService } from './combos.service';
import { CreateComboDto, UpdateComboDto } from './dto/combos.dto';

@ApiTags('combos')
@Controller('combos')
export class CombosController {
  constructor(private readonly service: CombosService) {}

  /**
   * Listar combos — público para clientes, mas com filtro por restaurante.
   * Staff deve usar a rota autenticada (sem query string) para evitar
   * expor combos de restaurante errado.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar combos do restaurante (público)' })
  @ApiResponse({ status: 200, description: 'Página de combos' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string, @Query() page: PageQueryDto) {
    return this.service.findByRestaurant(restaurantId, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obter combo por ID (público)' })
  @ApiResponse({ status: 200, description: 'Combo encontrado' })
  @ApiResponse({ status: 404, description: 'Combo não encontrado' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /**
   * Criação de combo — **staff only** (`gerente | dono`).
   * `restaurantId` do body é IGNORADO; usa-se o do JWT.
   */
  @Post()
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar novo combo' })
  @ApiResponse({ status: 201, description: 'Combo criado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async create(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateComboDto) {
    if (!req.user.restaurantId) {
      throw new ForbiddenException('Usuário sem restaurante vinculado');
    }
    return this.service.create({
      ...data,
      restaurantId: req.user.restaurantId,
    });
  }

  @Patch(':id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar combo' })
  @ApiResponse({ status: 200, description: 'Combo atualizado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateComboDto
  ) {
    return this.service.update(id, data, req.user.restaurantId);
  }

  @Delete(':id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir combo (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Combo excluído' })
  @ApiResponse({ status: 403, description: 'Acesso restrito ao dono' })
  async delete(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.service.delete(id, req.user.restaurantId);
    return { success: true };
  }
}
