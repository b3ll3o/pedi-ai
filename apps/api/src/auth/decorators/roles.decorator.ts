import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Chave de metadata usada pelo `RolesGuard` para identificar os papéis permitidos.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator que marca um handler (ou controller) com os papéis que podem acessá-lo.
 *
 * @example
 *   @Roles('dono', 'gerente')
 *   @Patch('profiles/:id')
 *   updateProfile() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
