import { Module, Global, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { DatabaseModule } from '../common/database.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { assertSecretStrength } from './secret-strength';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is required');
        }
        // Falha boot se secret for fraco — em produção isso evita rodar com
        // o placeholder "your-super-secret-jwt-key-change-in-production" de
        // `.env.example` que algum dev pode ter copiado sem editar.
        assertSecretStrength('JWT_SECRET', secret);
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') as StringValue,
          },
        };
      },
      inject: [ConfigService],
    }),
    DatabaseModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, JwtStrategy],
  exports: [AuthService, RefreshTokenService, JwtModule, PassportModule],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  /**
   * Auditoria A-S-03/C-S-01: validar **todos** os secrets críticos no boot.
   * Antes, `JWT_REFRESH_SECRET` só era checado no primeiro login; em produção,
   * o pod subia e a primeira chamada caía com 500.
   */
  onModuleInit() {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      const msg = 'JWT_REFRESH_SECRET ausente — não é possível emitir refresh tokens.';
      if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
      }
      this.logger.warn(msg);
    } else {
      assertSecretStrength('JWT_REFRESH_SECRET', refreshSecret);
    }
  }
}
