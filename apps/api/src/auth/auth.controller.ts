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

/**
 * Limite por minuto para endpoints sensíveis (login/register/refresh/
 * reset). Em produção/dev/staging é 5/min (defesa contra brute-force
 * e abuso de reset); em `NODE_ENV=e2e` (suíte E2E paralelizada) é
 * elevado para acomodar dezenas de logins/min no mesmo IP sem
 * receber 429 — vide `apps/api/src/app.module.ts` para o mesmo pattern
 * no tier global.
 */
const AUTH_ENDPOINT_LIMIT = process.env.NODE_ENV === 'e2e' ? 100_000 : 5;

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
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Auditoria P0-02 (2026-07-29): o decorator `@Throttle` foi movido do
  // nível de classe para os métodos individuais que precisam de limite
  // estrito. Antes, TODOS os endpoints do AuthController (incluindo
  // `/me`, `/logout`) compartilhavam o budget de 5/min — um usuário que
  // legitimamente fizesse polling de `/me` poderia esgotar o budget de
  // `/login`, bloqueando brute-force legitimate refresh.
  //
  // O nome do tier nas chaves do decorator (`{ default: ... }`) deve
  // bater com o `name` registrado no `ThrottlerModule.forRoot` — caso
  // contrário, o decorator é no-op.
  //
  // Auditoria P0-04 (2026-07-29): `@Public()` foi removido do nível de
  // classe e adicionado explicitamente aos métodos que precisam dele
  // (login, register, refresh, request-reset, reset-password). Antes,
  // o `@Public()` no nível de classe sobrescrevia o `@UseGuards(JwtAuthGuard)`
  // aplicado em `/me` e `/logout` via `Reflector.getAllAndOverride` —
  // esses endpoints eram tratados como públicos, e `req.user` ficava
  // `undefined`. Sintoma: `/auth/me` retornava `200` com corpo vazio.
  //
  // Limites por método:
  // - 5/min: register, login, refresh, request-reset, reset-password
  //          (proteção contra brute-force e abuso de reset)
  // - 300/min (global): me, logout (autenticados, baixo risco)

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: AUTH_ENDPOINT_LIMIT } })
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

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: AUTH_ENDPOINT_LIMIT } })
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

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: AUTH_ENDPOINT_LIMIT } })
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

  @Public()
  @Post('request-reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: AUTH_ENDPOINT_LIMIT } })
  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  @ApiResponse({ status: 200, description: 'Email de recuperação enviado se o email existir' })
  async requestReset(@Body() body: RequestResetDto) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: AUTH_ENDPOINT_LIMIT } })
  @ApiOperation({ summary: 'Redefinir senha com token' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
