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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';
import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get('profiles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar usuários por restaurante' })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  async getProfilesByRestaurant(@Query('restaurantId') restaurantId: string) {
    return this.usersService.findByRestaurant(restaurantId);
  }

  @Get('profiles/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getProfileById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('profiles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Criar usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createProfile(
    @Body() data: { restaurantId: string; email: string; name: string; role: UserRole }
  ) {
    return this.usersService.createProfile(data);
  }

  @Patch('profiles/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateProfile(
    @Param('id') id: string,
    @Body() data: { name?: string; email?: string; role?: UserRole }
  ) {
    return this.usersService.updateProfile(id, data);
  }

  @Delete('profiles/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remover usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async deleteProfile(@Param('id') id: string) {
    return this.usersService.deleteProfile(id);
  }

  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async updateMe(@Req() _req: { user: AuthenticatedUser }, @Body() _updateData: { name?: string }) {
    return { message: 'User updated' };
  }
}
