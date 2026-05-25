import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';

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

  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Atualizar usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async updateMe(@Req() _req: { user: AuthenticatedUser }, @Body() _updateData: { name?: string }) {
    return { message: 'User updated' };
  }
}
