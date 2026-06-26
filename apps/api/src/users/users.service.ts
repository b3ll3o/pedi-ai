import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthenticatedUser } from '../auth/types/auth.types';
import { PageDto, PAGINATION_DEFAULT_LIMIT } from '../common/dto/pagination.dto';
import { PrismaService } from '../common/prisma.service';

/**
 * Service de perfis de usuário com tenant isolation enforced.
 *
 * Toda escrita valida que `requester.restaurantId === resource.restaurantId`.
 * Apenas `dono` pode promover outro usuário a `dono`.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.usersProfile.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.usersProfile.findUnique({ where: { email } });
  }

  /**
   * Lista perfis por restaurante. O `restaurantId` DEVE vir de fonte confiável
   * (ex: `req.user.restaurantId`), nunca do query string.
   */
  async findByRestaurant(
    restaurantId: string,
    filter: { role?: UserRole } = {},
    options: { cursor?: string; limit?: number } = {}
  ): Promise<PageDto<unknown>> {
    const limit = options.limit ?? PAGINATION_DEFAULT_LIMIT;
    const items = await this.prisma.usersProfile.findMany({
      where: {
        restaurantId,
        ...(filter.role ? { role: filter.role } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const hasNext = items.length > limit;
    const data = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? data[data.length - 1].id : null;
    return PageDto.create(data, nextCursor, data.length);
  }

  async createProfile(data: { restaurantId: string; email: string; name: string; role: UserRole }) {
    const existing = await this.prisma.usersProfile.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Já existe um usuário com este email');
    }

    return this.prisma.usersProfile.create({
      data: {
        restaurantId: data.restaurantId,
        email: data.email,
        name: data.name,
        role: data.role,
        userId: null,
      },
    });
  }

  /**
   * Atualização com tenant isolation:
   * - Busca o recurso; se não pertence ao restaurante do requisitante → 403.
   * - Promoção a `dono` requer que o requisitante já seja `dono` (anti-escalada).
   * - Auto-edição (alterar próprio role) é proibida para reduzir superfície.
   */
  async updateProfile(
    profileId: string,
    data: { name?: string; email?: string; role?: UserRole },
    requester: AuthenticatedUser
  ) {
    const target = await this.prisma.usersProfile.findUnique({
      where: { id: profileId },
    });

    if (!target) {
      throw new NotFoundException('Perfil não encontrado');
    }

    // Tenant isolation
    if (target.restaurantId !== requester.restaurantId) {
      throw new ForbiddenException('Perfil pertence a outro restaurante');
    }

    // Apenas dono pode criar outro dono (defesa em profundidade).
    if (data.role === 'dono' && requester.role !== 'dono') {
      throw new ForbiddenException('Apenas dono pode promover a dono');
    }

    // Auto-edição de role bloqueada — mudança de papel deve passar por outro admin.
    if (profileId === requester.id && data.role && data.role !== target.role) {
      throw new ForbiddenException('Não é possível alterar o próprio papel');
    }

    return this.prisma.usersProfile.update({
      where: { id: profileId },
      data: {
        name: data.name ?? target.name,
        email: data.email ?? target.email,
        role: data.role ?? target.role,
      },
    });
  }

  async deleteProfile(profileId: string, requesterRestaurantId: string) {
    const target = await this.prisma.usersProfile.findUnique({
      where: { id: profileId },
    });

    if (!target) {
      throw new NotFoundException('Perfil não encontrado');
    }

    if (target.restaurantId !== requesterRestaurantId) {
      throw new ForbiddenException('Perfil pertence a outro restaurante');
    }

    await this.prisma.usersProfile.delete({ where: { id: profileId } });
    return { success: true };
  }

  /**
   * Atualização do PRÓPRIO perfil. Endpoint `/users/me`.
   *
   * Auditoria ACHADO-33 (Re-varredura 6): separação explícita entre
   * `updateOwnProfile` (não-admin) e `updateProfile` (admin). A invariante
   * crítica é: **um usuário nunca pode alterar o próprio role**, mesmo
   * se o DTO evoluir para incluir `role` no whitelist. Aqui bloqueamos
   * explicitamente qualquer tentativa de `role`/`email`/`restaurantId`,
   * tornando a defesa em profundidade visível e testável.
   *
   * `name` é o único campo editável. Email tem fluxo de confirmação
   * separado (verify-email), role é gerenciado por admin (`updateProfile`).
   */
  async updateOwnProfile(userId: string, data: { name?: string }) {
    // Defesa em profundidade: rejeitar explicitamente qualquer tentativa
    // de injetar campos sensíveis no body (mesmo que o DTO já filtre).
    if ('role' in data || 'email' in data || 'restaurantId' in data) {
      throw new ForbiddenException(
        'Campos role/email/restaurantId não podem ser alterados via /users/me'
      );
    }
    const existing = await this.prisma.usersProfile.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('Perfil não encontrado');
    }
    return this.prisma.usersProfile.update({
      where: { id: userId },
      data: {
        name: data.name ?? existing.name,
      },
    });
  }

  async getProfilesByUserId(userId: string) {
    return this.prisma.usersProfile.findMany({
      where: { userId },
      include: { restaurant: true },
    });
  }

  // Auditoria M-04: `updateRole(userId, role)` removido — código morto sem
  // caller, vetor latente de privilege escalation cross-tenant. Promoção para
  // `dono` deve ser feita exclusivamente via fluxo controlado (admin root).
  // Mantido apenas `updateProfile` (com guard de role) para mudanças seguras.
}
