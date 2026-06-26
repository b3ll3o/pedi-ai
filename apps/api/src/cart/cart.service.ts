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
   * Refatorado (2ª varredura QA): complexidade ciclomática era 19 (> limite
   * 15 do ESLint). Extraído em helpers privados:
   *   - `resolveRestaurantId` (staff vs cliente)
   *   - `validateTable` (tableId do body)
   *   - `validateProducts` (preço + disponibilidade)
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
    const effectiveRestaurantId = await this.resolveRestaurantId({
      requesterRole,
      requesterRestaurantId,
      requestRestaurantId: request.restaurantId,
      tableId,
    });

    if (!items || items.length === 0) {
      return {
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      };
    }

    const errors: string[] = [];

    // ── Validate table ──────────────────────────────────────────────
    if (tableId) {
      const tableOk = await this.validateTable(tableId, effectiveRestaurantId);
      if (!tableOk) errors.push('Mesa inválida ou inativa');
    }

    // ── Validate products ───────────────────────────────────────────
    const productErrors = await this.validateProducts(items, effectiveRestaurantId);
    errors.push(...productErrors);

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Resolve o `restaurantId` efetivo com base no papel do usuário.
   * Staff: JWT é mandatório. Cliente: body (forçado pela mesa se houver).
   */
  private async resolveRestaurantId(args: {
    requesterRole: string;
    requesterRestaurantId: string | null;
    requestRestaurantId: string | undefined;
    tableId: string | undefined;
  }): Promise<string> {
    const { requesterRole, requesterRestaurantId, requestRestaurantId, tableId } = args;

    if (STAFF_ROLES.has(requesterRole)) {
      if (!requesterRestaurantId) {
        throw new ForbiddenException(
          'Usuário staff sem restaurante vinculado — contate o administrador'
        );
      }
      if (requestRestaurantId && requestRestaurantId !== requesterRestaurantId) {
        throw new ForbiddenException('restaurantId do body não corresponde ao usuário autenticado');
      }
      return requesterRestaurantId;
    }

    // Cliente: aceita body, mas se houver tableId, força pelo restaurante da mesa.
    if (tableId) {
      const table = await this.prisma.table.findFirst({
        where: { id: tableId, active: true },
        select: { restaurantId: true },
      });
      if (!table) {
        throw new BadRequestException('Mesa inválida ou inativa');
      }
      return table.restaurantId;
    }
    if (!requestRestaurantId) {
      throw new BadRequestException(
        'Cliente sem mesa vinculada deve informar restaurantId no body'
      );
    }
    return requestRestaurantId;
  }

  /**
   * Verifica que a mesa existe, pertence ao restaurante e está ativa.
   */
  private async validateTable(tableId: string, restaurantId: string): Promise<boolean> {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, restaurantId, active: true },
    });
    return Boolean(table);
  }

  /**
   * Valida cada item do carrinho contra produtos do restaurante:
   * existência, disponibilidade e preço server-side (anti-tampering).
   */
  private async validateProducts(
    items: ValidateCartDto['items'],
    restaurantId: string
  ): Promise<string[]> {
    const errors: string[] = [];
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        category: { restaurantId, deletedAt: null },
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
    return errors;
  }
}
