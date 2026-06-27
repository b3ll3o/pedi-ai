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
 *   - Handler `avaliar` é público (sem user → bypass)
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

const READ_METHODS = new Set(['GET', 'HEAD']);
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class FeatureFlagAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      user?: { role?: string; sub?: string };
    }>();
    const handler = context.getHandler();

    // Handler `avaliar` é marcado como público (sem user → bypass)
    if (handler.name === 'avaliar') {
      return true;
    }

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
