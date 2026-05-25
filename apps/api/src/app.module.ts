import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { CombosModule } from './combos/combos.module';
import { DatabaseModule } from './common/database.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { ModifierGroupsModule } from './modifier-groups/modifier-groups.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TablesModule } from './tables/tables.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
    DatabaseModule,
    AnalyticsModule,
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
})
export class AppModule {}
