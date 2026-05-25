import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService, AuthResponse } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './types/auth.types';

/**
 * Rate limiting para rotas de autenticação.
 * Limite de 10 req/min protege contra brute-force em login/register/refresh.
 */
@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { ttl: 60_000, limit: 10 }, short: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<{ access_token: string }> {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obter usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async me(@Req() req: { user: AuthenticatedUser }) {
    return req.user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout do usuário' })
  @ApiResponse({ status: 200, description: 'Logout realizado' })
  async logout() {
    return { message: 'Logout realizado com sucesso' };
  }

  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  @ApiResponse({ status: 200, description: 'Email de recuperação enviado se o email existir' })
  async requestReset(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body);
  }
}
