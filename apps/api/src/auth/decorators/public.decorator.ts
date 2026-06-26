import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadata para marcar rotas como públicas (sem autenticação).
 * Usada pelo `JwtAuthGuard` global (ver `app.module.ts`).
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator que marca uma rota como pública — `JwtAuthGuard` a ignorará.
 *
 * @example
 *   @Public()
 *   @Get('health')
 *   health() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
