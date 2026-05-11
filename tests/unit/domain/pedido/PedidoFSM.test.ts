import { describe, it, expect } from 'vitest';
import { Pedido, PedidoProps } from '@/domain/pedido/entities/Pedido';
import { StatusPedido } from '@/domain/pedido/value-objects/StatusPedido';
import { Dinheiro } from '@/domain/shared/value-objects/Dinheiro';

/**
 * Unit tests para a FSM (Finite State Machine) de Pedido — MVP Multica.
 * Valida as transições de status definidas em:
 *   recebido → preparando → pronto → entregue
 *
 * O MVP não possui etapa de pagamento online - pedidos são criados
 * diretamente com status 'recebido'.
 */
describe('Pedido — FSM de Status (MVP)', () => {
  const criarPedido = (status: StatusPedido = StatusPedido.RECEIVED): Pedido => {
    const props: PedidoProps = {
      id: crypto.randomUUID(),
      restauranteId: 'restaurante-1',
      status,
      itens: [],
      subtotal: Dinheiro.ZERO,
      tax: Dinheiro.ZERO,
      total: Dinheiro.ZERO,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return new Pedido(props);
  };

  // ═══════════════════════════════════════════════════════════════
  // Fluxo principal MVP: sem pagamento
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxo principal MVP (recebido → entrega)', () => {
    it('received → preparing (cozinha iniciou preparo)', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      pedido.alterarStatus(StatusPedido.PREPARING);
      expect(pedido.status).toEqual(StatusPedido.PREPARING);
    });

    it('preparing → ready (pedido pronto para retirada)', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.READY);
      expect(pedido.status).toEqual(StatusPedido.READY);
    });

    it('ready → delivered (pedido entregue ao cliente)', () => {
      const pedido = criarPedido(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.DELIVERED);
      expect(pedido.status).toEqual(StatusPedido.DELIVERED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Fluxos de cancelamento
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxos de cancelamento', () => {
    it('received → cancelled', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });

    it('preparing → cancelled', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });

    it('ready → cancelled', () => {
      const pedido = criarPedido(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.CANCELLED);
      expect(pedido.status).toEqual(StatusPedido.CANCELLED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Fluxos de rejeição
  // ═══════════════════════════════════════════════════════════════

  describe('Fluxos de rejeição (restaurante recusa)', () => {
    it('received → rejected', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });

    it('preparing → rejected', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });

    it('ready → rejected', () => {
      const pedido = criarPedido(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.READY);
      pedido.alterarStatus(StatusPedido.REJECTED);
      expect(pedido.status).toEqual(StatusPedido.REJECTED);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Estados terminais
  // ═══════════════════════════════════════════════════════════════

  describe('Estados terminais', () => {
    it('delivered → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.DELIVERED);
      expect(() => pedido.alterarStatus(StatusPedido.CANCELLED)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.REJECTED)).toThrow();
    });

    it('cancelled → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.CANCELLED);
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });

    it('rejected → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.REJECTED);
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Transições INVÁLIDAS — devem lançar erro
  // ═══════════════════════════════════════════════════════════════

  describe('Transições inválidas (devem lançar erro)', () => {
    it('received → paid é inválido (MVP não usa payment)', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('preparing → paid é inválido', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      expect(() => pedido.alterarStatus(StatusPedido.PAID)).toThrow();
    });

    it('preparing → received é inválido', () => {
      const pedido = criarPedido(StatusPedido.PREPARING);
      expect(() => pedido.alterarStatus(StatusPedido.RECEIVED)).toThrow();
    });

    it('ready → preparing é inválido', () => {
      const pedido = criarPedido(StatusPedido.READY);
      expect(() => pedido.alterarStatus(StatusPedido.PREPARING)).toThrow();
    });

    it('delivered → any é inválido (estado terminal)', () => {
      const pedido = criarPedido(StatusPedido.DELIVERED);
      expect(() => pedido.alterarStatus(StatusPedido.CANCELLED)).toThrow();
      expect(() => pedido.alterarStatus(StatusPedido.REJECTED)).toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Não altera se status é o mesmo
  // ═══════════════════════════════════════════════════════════════

  describe('Não altera se status é o mesmo', () => {
    it('não lança erro e não altera updatedAt quando status é idêntico', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      const updatedAtAntes = pedido.updatedAt;

      pedido.alterarStatus(StatusPedido.RECEIVED);

      expect(pedido.status).toEqual(StatusPedido.RECEIVED);
      expect(pedido.updatedAt).toEqual(updatedAtAntes);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Mensagem de erro da FSM
  // ═══════════════════════════════════════════════════════════════

  describe('Mensagem de erro da FSM', () => {
    it('inclui o status atual e o desejado na mensagem', () => {
      const pedido = criarPedido(StatusPedido.RECEIVED);
      try {
        pedido.alterarStatus(StatusPedido.PAID);
        expect.fail('Deveria ter lançado erro');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        expect(msg).toContain('received');
        expect(msg).toContain('paid');
      }
    });
  });
});