import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validar carrinho antes do pedido' })
  @ApiResponse({ status: 200, description: 'Validação realizada com sucesso' })
  async validateCart(
    @Body()
    body: {
      items: Array<{
        id: string;
        productId: string;
        name?: string;
        quantity: number;
        unitPrice: number;
        modifiers?: Array<{ group_id: string; value_id: string }>;
      }>;
      restaurantId: string;
      tableId?: string;
    }
  ) {
    return this.cartService.validateCart(body);
  }
}
