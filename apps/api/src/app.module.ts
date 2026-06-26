import { MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from './analytics/analytics.module';
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
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { CleanupQueue } from './queues/cleanup.queue';
import { EmailQueue } from './queues/email.queue';
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
     * Throttling tierizado:
     * - `short`: rotas sensíveis (login/register/refresh) — 5 req/min por IP.
     * - `medium`: escritas autenticadas — 30 req/min.
     * - `long`: leitura pública — 300 req/min (cardápio, categorias).
     *
     * Health/metrics usam `@SkipThrottle()` quando monitorados externamente.
     */
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000, limit: 5 },
      { name: 'medium', ttl: 60_000, limit: 30 },
      { name: 'long', ttl: 60_000, limit: 300 },
    ]),
    DatabaseModule,
    QueueModule,
    AnalyticsModule,
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
  ],
  providers: [
    // Guard JWT global — rotas marcadas com @Public() são liberadas.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Guard de papéis global — só atua onde há @Roles().
    { provide: APP_GUARD, useClass: RolesGuard },
    EmailQueue,
    // Auditoria ACHADO-7 (Re-varredura 5): cleanup diário de tokens/keys
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
