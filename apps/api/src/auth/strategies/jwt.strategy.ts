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
    //
    // Auditoria ACHADO-N6 (Re-varredura 8): em produção/staging, iss/aud
    // passam a ser OBRIGATÓRIOS. Sem eles, qualquer token HS256 com a
    // secret era aceito — vetor de cross-system reuse se o secret vazar
    // ou for compartilhado entre ambientes. Agora: fail-CLOSED em
    // prod/staging (boot aborta), opcional em dev (UX preservada).
    const issuer = configService.get<string>('JWT_ISSUER');
    const audience = configService.get<string>('JWT_AUDIENCE');
    const isStrict = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    if (isStrict && (!issuer || !audience)) {
      throw new Error(
        'JWT_ISSUER e JWT_AUDIENCE são obrigatórios em produção/staging. ' +
          'Sem eles, tokens cross-system seriam aceitos.'
      );
    }
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
      // Validação opcional de iss/aud em dev, obrigatória em prod (já validada acima).
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
