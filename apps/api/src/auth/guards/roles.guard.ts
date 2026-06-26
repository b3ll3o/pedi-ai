import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard que valida se o usuário autenticado possui pelo menos um dos papéis exigidos.
 *
 * - Sem `@Roles()` → rota liberada para qualquer usuário autenticado.
 * - Com `@Roles('dono', 'gerente')` → apenas esses papéis passam.
 *
 * Pré-requisito: rodar após `JwtAuthGuard` (para popular `req.user`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userRole = user.role as UserRole;
    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(`Acesso restrito aos papéis: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
