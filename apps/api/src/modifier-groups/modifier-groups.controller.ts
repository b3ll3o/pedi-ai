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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageQueryDto } from '../common/dto/pagination.dto';

import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  AddModifierValueDto,
  UpdateModifierValueDto,
} from './dto/modifier-groups.dto';
import { ModifierGroupsService } from './modifier-groups.service';

@ApiTags('modifier-groups')
@Controller('modifier-groups')
export class ModifierGroupsController {
  constructor(private readonly service: ModifierGroupsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar grupos de modificadores (público)' })
  @ApiResponse({ status: 200, description: 'Página de grupos' })
  async findByRestaurant(@Query('restaurantId') restaurantId: string, @Query() page: PageQueryDto) {
    return this.service.findByRestaurant(restaurantId, {
      cursor: page.cursor,
      limit: page.limit,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obter grupo por ID (público)' })
  @ApiResponse({ status: 200, description: 'Grupo encontrado' })
  @ApiResponse({ status: 404, description: 'Grupo não encontrado' })
  async findById(@Param('id') id: string) {
    const group = await this.service.findById(id);
    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }
    return group;
  }

  @Post()
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar grupo de modificadores' })
  @ApiResponse({ status: 201, description: 'Grupo criado' })
  @ApiResponse({ status: 403, description: 'Acesso restrito' })
  async create(@Req() req: { user: AuthenticatedUser }, @Body() data: CreateModifierGroupDto) {
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
  @ApiOperation({ summary: 'Atualizar grupo de modificadores' })
  @ApiResponse({ status: 200, description: 'Grupo atualizado' })
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateModifierGroupDto
  ) {
    return this.service.update(id, data, req.user.restaurantId);
  }

  @Delete(':id')
  @Roles('dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir grupo (apenas dono)' })
  @ApiResponse({ status: 200, description: 'Grupo excluído' })
  async delete(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.service.delete(id, req.user.restaurantId);
    return { success: true };
  }

  @Post(':id/values')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Adicionar valor ao grupo' })
  @ApiResponse({ status: 201, description: 'Valor adicionado' })
  async addValue(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: AddModifierValueDto
  ) {
    return this.service.addValue(id, data, req.user.restaurantId);
  }

  @Patch('values/:id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar valor do grupo' })
  @ApiResponse({ status: 200, description: 'Valor atualizado' })
  async updateValue(
    @Req() req: { user: AuthenticatedUser },
    @Param('id') id: string,
    @Body() data: UpdateModifierValueDto
  ) {
    return this.service.updateValue(id, data, req.user.restaurantId);
  }

  @Get('values/:id')
  @Public()
  @ApiOperation({ summary: 'Obter valor por ID (público)' })
  @ApiResponse({ status: 200, description: 'Valor encontrado' })
  @ApiResponse({ status: 404, description: 'Valor não encontrado' })
  async getValue(@Param('id') id: string) {
    const value = await this.service.findValueById(id);
    if (!value) {
      throw new NotFoundException('Valor não encontrado');
    }
    return value;
  }

  @Delete('values/:id')
  @Roles('gerente', 'dono')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Excluir valor do grupo' })
  @ApiResponse({ status: 200, description: 'Valor excluído' })
  async deleteValue(@Req() req: { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.service.deleteValue(id, req.user.restaurantId);
    return { success: true };
  }
}
