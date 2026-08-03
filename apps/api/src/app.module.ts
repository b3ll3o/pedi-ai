import { MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from './analytics/analytics.module';
import { FeatureFlagsModule } from './presentation/admin/feature-flags/module/feature-flags.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CombosModule } from './combos/combos.module';
import { DatabaseModule } from './common/database.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { ModifierGroupsModule } from './modifier-groups/modifier-groups.module';
import { ObservabilityModule } from './observability/observability.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { CleanupQueue } from './queues/cleanup.queue';
import { QueueModule } from './queues/queue.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TablesModule } from './tables/tables.module';
import { shutdownOtel } from './tracing/tracing';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    /**
     * Throttling global — único tier `default` (300 req/min/IP).
     *
     * **Por que apenas um tier?**
     * `ThrottlerGuard.canActivate` itera TODOS os tiers registrados em
     * `forRoot([...])` e exige que TODOS passem (`continues.every(...)`).
     * Cada tier aplica seu próprio contador por IP, independentemente de
     * a rota ter `@Throttle({...})` decorando-a ou não. Ter múltiplos
     * tiers (ex.: `short: 5/min` + `medium: 30/min` + `long: 300/min`)
     * limita **toda a API** ao tier mais restritivo (5/min), pois
     * `short` é avaliado em toda requisição. Isso é o bug P0-02
     * originalmente reportado: o tier `short` global era aplicado a
     * rotas que deveriam ter 30/min ou 300/min.
     *
     * **Estratégia correta:** registrar APENAS o tier `default`
     * permissivo (300/min). Rotas que precisam de limites mais
     * restritos sobrescrevem o tier `default` via
     * `@Throttle({ default: { ttl, limit } })`. Rotas que não devem
     * ser limitadas (health, webhooks) usam
     * `@SkipThrottle({ default: true })`.
     *
     * @see https://github.com/nestjs/throttler/blob/v6.5.0/src/throttler.guard.ts
     */
    // Throttler em ambiente E2E (NODE_ENV=e2e) é elevado para acomodar
    // a suíte E2E paralelizada (~8 workers × 1 login por teste =
    // dezenas de logins/min no mesmo IP). Em produção/dev/staging o
    // limite padrão (300/min) permanece para defesa contra brute-force.
    //
    // Sem este relaxamento, testes E2E paralelos recebem HTTP 429 em
    // `/auth/login` (limite específico de 5/min), `apiClient.login()`
    // lança erro e `page.waitForURL` na fixture auth timeouta em 45s.
    //
    // @see apps/api/src/auth/auth.controller.ts (login/register/refresh
    //   têm @Throttle({ default: { limit: 5 } }) — também relaxado).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: process.env.NODE_ENV === 'e2e' ? 100_000 : 300,
      },
    ]),
    DatabaseModule,
    QueueModule,
    AnalyticsModule,
    FeatureFlagsModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    CategoriesModule,
    ProductsModule,
    MenuModule,
    ModifierGroupsModule,
    CombosModule,
    OrdersModule,
    PaymentsModule,
    RealtimeModule,
    TablesModule,
    SubscriptionsModule,
    CartModule,
    HealthModule,
    ObservabilityModule,
  ],
  providers: [
    // Guard JWT global — rotas marcadas com @Public() são liberadas.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Guard de papéis global — só atua onde há @Roles().
    { provide: APP_GUARD, useClass: RolesGuard },
    // P0-02 (auditoria 2026-07-29): ThrottlerGuard global honrando todos os
    // `@Throttle()` decorators. Sem este provider, rate-limiting não opera.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // EmailQueue é fornecido por QueueModule (@Global()). Auditoria
    // ACHADO-7 (Re-varredura 5): cleanup diário de tokens/keys
    // expirados (IdempotencyKey, PasswordResetToken, RefreshToken, WebhookEvent).
    CleanupQueue,
  ],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  /**
   * Aplica o middleware de requestId em todas as rotas (auditoria A15).
   * Garante que cada requisição carregue um ID único correlacionável
   * entre logs do servidor e o cliente.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }

  /**
   * Auditoria M13: orquestrado pelo `enableShutdownHooks()` do NestJS.
   * Encerrar o OTel **depois** dos módulos garante que os últimos spans
   * (em flush pendente) sejam exportados antes do processo sair.
   */
  async onApplicationShutdown(_signal?: string) {
    await shutdownOtel();
  }
}
