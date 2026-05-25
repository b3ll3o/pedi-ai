import { Injectable } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

interface CartItem {
  id: string;
  productId: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  modifiers?: Array<{ group_id: string; value_id: string }>;
}

interface ValidateCartRequest {
  items: CartItem[];
  restaurantId: string;
  tableId?: string;
}

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async validateCart(request: ValidateCartRequest) {
    const { items, restaurantId, tableId } = request;

    if (!items || items.length === 0) {
      return {
        valid: false,
        errors: ['Carrinho vazio - adicione itens para fazer o pedido'],
      };
    }

    const errors: string[] = [];

    // Validate table if provided
    if (tableId) {
      const table = await this.prisma.table.findFirst({
        where: { id: tableId, restaurantId, active: true },
      });
      if (!table) {
        errors.push('Mesa inválida ou inativa');
      }
    }

    // Validate products
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
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
      if (item.unitPrice !== product.price) {
        errors.push(
          `Preço do produto '${product.name}' mudou de R$ ${product.price.toFixed(2)} para R$ ${item.unitPrice.toFixed(2)}`
        );
      }
      // Check restaurant match
      if (product.category.restaurantId !== restaurantId) {
        errors.push(`Produto '${product.name}' não pertence a este restaurante`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }
}
