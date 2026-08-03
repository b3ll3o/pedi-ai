/**
 * @spec(RNF-SEC-FF-01)
 *
 * `FeatureFlagAdminGuard` — RBAC granular para o admin de feature flags.
 *
 * Regras:
 *   - `owner` → todos os métodos (CRUD + override + audit + list)
 *   - `manager` → apenas leitura (GET)
 *   - `staff` / outros → sempre bloqueado
 *   - Sem user no request → 401 (fail-closed)
 *   - user sem role → 403 (fail-closed)
 *   - role desconhecida → 403 (fail-closed)
 *   - Rotas marcadas com `@Public()` são liberadas sem checar role
 *     (mesma convenção do `JwtAuthGuard`).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../../../auth/decorators/public.decorator';

const READ_METHODS = new Set(['GET', 'HEAD']);
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class FeatureFlagAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Rotas `@Public()` (ex.: `avaliar`) são liberadas sem checar role.
    // Usamos `Reflector` com `IS_PUBLIC_KEY` — mesma chave do JwtAuthGuard,
    // garantindo fonte única de verdade para "rota pública".
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      user?: { role?: string; sub?: string };
    }>();

    if (!request.user) {
      throw new UnauthorizedException('Token ausente ou inválido');
    }

    const role = request.user.role;
    if (!role) {
      throw new ForbiddenException('role ausente no token');
    }

    const method = request.method.toUpperCase();
    const isRead = READ_METHODS.has(method);
    const isMutation = MUTATION_METHODS.has(method);

    if (role === 'owner' || role === 'dono') {
      return true;
    }

    if (role === 'manager' || role === 'gerente') {
      if (isRead) return true;
      if (isMutation) {
        throw new ForbiddenException('Apenas owner pode realizar mutações em feature flags');
      }
    }

    throw new ForbiddenException(`Papel '${role}' não tem acesso a feature flags`);
  }
}
