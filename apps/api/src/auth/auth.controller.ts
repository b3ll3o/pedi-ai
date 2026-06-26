import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';

import { AuthService, AuthResponse } from './auth.service';
import { clearAuthCookies, setAuthCookies } from './cookie-helper';
import { Public } from './decorators/public.decorator';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  LogoutDto,
  RequestResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './types/auth.types';

// Tempo de vida dos tokens em ms. Deve alinhar com JWT_EXPIRES_IN e
// REFRESH_TOKEN_EXPIRES_IN (estes últimos controlam o JWT em si; os valores
// aqui só dizem ao navegador por quanto tempo guardar o cookie).
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 min
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * Rotas de autenticação. Todas marcadas `@Public()` — `JwtAuthGuard` global as ignora.
 *
 * Throttling dedicado (5 req/min) para login/register/refresh — protege contra brute-force
 * sem afetar o throttler global usado pelas demais rotas.
 */
@ApiTags('auth')
@Controller('auth')
@Public()
@Throttle({ short: { ttl: 60_000, limit: 5 } })
// Auditoria ACHADO-N12 (Re-varredura 8): tier 'default' não existe no
// AppModule (todos os tiers têm `name` explícito: short/medium/long).
// O decorator original `default + short` tinha `default` como no-op —
// o rate-limit de fato era apenas o tier 'short' global (5/min) duplicado.
// Agora só declaramos 'short', explicitamente.
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<AuthResponse> {
    const result = await this.authService.register(dto);
    setAuthCookies(reply, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      accessMaxAgeMs: ACCESS_TOKEN_MAX_AGE_MS,
      refreshMaxAgeMs: REFRESH_TOKEN_MAX_AGE_MS,
    });
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto);
    setAuthCookies(reply, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      accessMaxAgeMs: ACCESS_TOKEN_MAX_AGE_MS,
      refreshMaxAgeMs: REFRESH_TOKEN_MAX_AGE_MS,
    });
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<{ access_token: string; refresh_token: string }> {
    const result = await this.authService.refresh(dto.refresh_token);
    setAuthCookies(reply, {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      accessMaxAgeMs: ACCESS_TOKEN_MAX_AGE_MS,
      refreshMaxAgeMs: REFRESH_TOKEN_MAX_AGE_MS,
    });
    return result;
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
  async logout(
    @Req() req: { user: AuthenticatedUser },
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: LogoutDto
  ) {
    // Auditoria ACHADO-N5: passar req.user.id para service comparar com o
    // userId extraído do refresh_token e impedir que um usuário autenticado
    // revogue sessões alheias.
    const result = await this.authService.logout(body?.refresh_token, req.user.id);
    clearAuthCookies(reply);
    return result;
  }

  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  @ApiResponse({ status: 200, description: 'Email de recuperação enviado se o email existir' })
  async requestReset(@Body() body: RequestResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
