import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/auth.types';

import { CartService } from './cart.service';
import { CartValidationResult, ValidateCartDto } from './dto/cart.dto';

@ApiTags('cart')
@ApiBearerAuth('JWT-auth')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Validação de carrinho **autenticada**.
   *
   * O `restaurantId` do body é **sobrescrito** pelo `restaurantId` do JWT
   * sempre que o requisitante for staff (`atendente`, `gerente`, `dono`).
   * Para clientes (`cliente`), o body é aceito, mas os produtos/mesas são
   * validados em relação ao restaurante da mesa ativa (quando informada).
   *
   * Auditoria: M2 — endpoint público permitia enumeração de `tableId`.
   */
  @Post('validate')
  @Roles('cliente', 'atendente', 'gerente', 'dono')
  @ApiOperation({
    summary: 'Validar carrinho antes do pedido (autenticado)',
    description:
      'Verifica disponibilidade, preço e tenant dos itens. **Requer autenticação**. ' +
      'Staff (atendente/gerente/dono): restaurantId é derivado do JWT, body ignorado.',
  })
  @ApiResponse({ status: 200, description: 'Resultado da validação', type: Object })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para o restaurante informado' })
  async validateCart(
    @Req() req: { user: AuthenticatedUser },
    @Body() body: ValidateCartDto
  ): Promise<CartValidationResult> {
    return this.cartService.validateCart(body, req.user);
  }
}
