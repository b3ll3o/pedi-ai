import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

import { AuthService, JwtPayload } from '../auth.service';
import { readAccessTokenFromCookies } from '../cookie-helper';

/**
 * Estratégia JWT padrão.
 *
 * Proteções:
 * - `algorithms: ['HS256']` explícito — previne `alg=none` e downgrade attacks.
 * - `ignoreExpiration: false` — tokens expirados são rejeitados.
 * - `secretOrKey` carregado do `ConfigService` (validado na inicialização).
 *
 * Modo de extração:
 * - **Primário**: cookie HttpOnly `pedi_ai_access` (mais seguro, imune a XSS).
 * - **Fallback**: header `Authorization: Bearer <jwt>` (para testes de
 *   integração, clients server-side, e compatibilidade durante migração).
 *
 * O access token continua sendo retornado no body da resposta de login/
 * refresh para que clientes SSR possam usá-lo; o cookie é a fonte canônica.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    // Auditoria ACHADO-28 (Re-varredura 6): validação de `iss`/`aud` se as
    // envs estiverem configuradas. Por padrão são opcionais para preservar
    // compatibilidade com tokens emitidos antes desta hardening, mas em
    // produção devem ser obrigatórias (recomenda-se setar `JWT_ISSUER` e
    // `JWT_AUDIENCE` no .env antes do deploy).
    const issuer = configService.get<string>('JWT_ISSUER');
    const audience = configService.get<string>('JWT_AUDIENCE');
    super({
      jwtFromRequest: (req: unknown) => {
        const r = req as {
          cookies?: Record<string, string | undefined>;
          headers?: Record<string, string | string[] | undefined>;
        };
        const fromCookie = readAccessTokenFromCookies(r.cookies);
        if (fromCookie) return fromCookie;
        const authHeader = r.headers?.authorization;
        if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
          return authHeader.slice(7);
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      // Validação opcional de iss/aud. Se configurados, `passport-jwt` rejeita
      // tokens com iss/aud divergentes. Se ausentes, mantém o comportamento
      // legado (qualquer token HS256 com a secret é aceito).
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return user;
  }
}
