/**
 * Módulo de Rate Limiting usando @nestjs/throttler.
 *
 * Configuração:
 * - default: 100 req/min (protege a API em geral)
 * - short:   30 req/min (endpoints intermediários)
 *
 * Para rotas de autenticação, usar @Throttle({ default: { limit: 10 } })
 * diretamente no controller (limite mais restritivo para brute-force).
 */

import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
      {
        name: 'short',
        ttl: 60_000,
        limit: 30,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerModule],
})
export class ThrottlerConfigModule {}
