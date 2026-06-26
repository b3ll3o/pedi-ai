import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/types/auth.types';
import { PrismaService } from '../common/prisma.service';

import { CartValidationResult, ValidateCartDto } from './dto/cart.dto';

/**
 * Papéis com vínculo direto a restaurante (staff).
 * Para estes, o `restaurantId` do body é IGNORADO em favor do JWT.
 */
const STAFF_ROLES = new Set(['atendente', 'gerente', 'dono']);

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valida o carrinho. Para staff, força `restaurantId` a partir do JWT —
   * o body é aceito apenas se compatível. Para clientes, aceita o body mas
   * valida produtos/mesas em relação ao restaurante da mesa (ou erro se
   * inconsistente).
   *
   * @param request DTO com items, restaurantId, tableId
   * @param requester Usuário autenticado (do JWT)
   */
  async validateCart(
    request: ValidateCartDto,
    requester: AuthenticatedUser
  ): Promise<CartValidationResult> {
    const { items, tableId } = request;
    const requesterRole = requester.role;
    const requesterRestaurantId = requester.restaurantId ?? null;

    // ── Tenant resolution ────────────────────────────────────────────
    let effectiveRestaurantId: string;
    if (STAFF_ROLES.has(requesterRole)) {
      // Staff: restaurantId do JWT é mandatório.
      if (!requesterRestaurantId) {
        throw new ForbiddenException(
          'Usuário staff sem restaurante vinculado — contate o administrador'
        );
      }
      // Ignora o body, usa o JWT.
      effectiveRestaurantId = requesterRestaurantId;
      if (request.restaurantId && request.restaurantId !== requesterRestaurantId) {
        // body não confere com JWT — log estruturado seria ideal; aqui apenas bloqueia.
        throw new ForbiddenException('restaurantId do body não corresponde ao usuário autenticado');
      }
    } else {
      // Cliente: aceita body, mas se houver tableId, força pelo restaurante da mesa.
      if (tableId) {
        const table = await this.prisma.table.findFirst({
          where: { id: tableId, active: true },
          select: { restaurantId: true },
        });
        if (!table) {
          throw new BadRequestException('Mesa inválida ou inativa');
        }
        effectiveRestaurantId = table.restaurantId;
      } else {
        if (!request.restaurantId) {
          throw new BadRequestException(
            'Cliente sem mesa vinculada deve informar restaurantId no body'
          );
        }
        effectiveRestaurantId = request.restaurantId;
      }
    }

    if (!items || items.length === 0) {
      return {
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      };
    }

    const errors: string[] = [];

    // ── Validate table ──────────────────────────────────────────────
    if (tableId) {
      const table = await this.prisma.table.findFirst({
        where: { id: tableId, restaurantId: effectiveRestaurantId, active: true },
      });
      if (!table) {
        errors.push('Mesa inválida ou inativa');
      }
    }

    // ── Validate products ───────────────────────────────────────────
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        category: { restaurantId: effectiveRestaurantId, deletedAt: null },
      },
      include: { category: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        errors.push(`Produto '${item.name || item.productId}' não encontrado`);
        continue;
      }
      if (!product.available) {
        errors.push(`Produto '${product.name}' não está mais disponível`);
      }
      // SECURITY: o preço do body é apenas **checado**; a fonte de verdade é o servidor.
      // Como ambos são inteiros em centavos (Prisma `Int` + DTO `@IsInt()`),
      // a igualdade estrita é segura e correta. Qualquer divergência indica
      // tampering do cliente — o pedido é recusado, nunca recalculado.
      if (item.unitPrice !== product.price) {
        errors.push(
          `Preço do produto '${product.name}' diverge do servidor — atualize o carrinho e tente novamente`
        );
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }
}
